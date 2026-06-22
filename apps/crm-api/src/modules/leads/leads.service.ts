import { Injectable, NotFoundException } from '@nestjs/common';
import { Timezone, LeadStatus, Role } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeadDto, ImportLeadsDto, ListLeadsQueryDto } from './dto/lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Resolve a free-text CALLER value (name or email) to a user id, if it
   * matches an existing user; otherwise undefined. Case-insensitive. */
  private async resolveCaller(caller?: string): Promise<string | undefined> {
    const q = caller?.trim();
    if (!q) return undefined;
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: { equals: q, mode: 'insensitive' } }, { name: { equals: q, mode: 'insensitive' } }] },
      select: { id: true },
    });
    return user?.id;
  }

  /** Map the optional lead-sheet fields from a DTO to Prisma data. */
  private sheetFields(dto: CreateLeadDto) {
    return {
      contactName: dto.contactName,
      industry: dto.industry,
      title: dto.title,
      vlc: dto.vlc,
      employeeCode: dto.employeeCode,
      comments: dto.comments,
      leadCategory: dto.leadCategory,
      nextFollowUpDate: dto.nextFollowUpDate ? new Date(dto.nextFollowUpDate) : undefined,
    };
  }

  async create(dto: CreateLeadDto) {
    // IMP-006 — auto-generate lead_id if not provided
    const leadId = dto.leadId ?? `L-${Date.now().toString(36).toUpperCase()}`;
    const assignedToId = await this.resolveCaller(dto.caller);
    return this.prisma.lead.create({
      data: {
        leadId,
        businessName: dto.businessName,
        phone: dto.phone,
        email: dto.email,
        state: dto.state,
        city: dto.city,
        timezone: dto.timezone,
        status: dto.status,
        ...(assignedToId ? { assignedTo: { connect: { id: assignedToId } } } : {}),
        ...this.sheetFields(dto),
      },
    });
  }

  // IMP-001/005 + AI-004 — bulk import with per-row validation and dedupe.
  async bulkImport(dto: ImportLeadsDto) {
    const errors: Array<{ row: number; reason: string }> = [];
    const seenInFile = new Set<string>();
    const toCreate: Array<{
      leadId: string;
      businessName: string;
      phone: string;
      email?: string;
      state: string;
      city: string;
      timezone: Timezone;
      status: LeadStatus;
      contactName?: string;
      industry?: string;
      title?: string;
      vlc?: string;
      employeeCode?: string;
      comments?: string;
      leadCategory?: string;
      nextFollowUpDate?: Date;
      caller?: string;
    }> = [];

    dto.rows.forEach((row, i) => {
      const n = i + 1;
      if (!row.businessName?.trim()) return errors.push({ row: n, reason: 'Missing business name' });
      if (!row.phone?.trim()) return errors.push({ row: n, reason: 'Missing phone' });
      if (!row.state?.trim()) return errors.push({ row: n, reason: 'Missing state' });
      if (!row.city?.trim()) return errors.push({ row: n, reason: 'Missing city' });
      const phoneKey = row.phone.replace(/\D/g, '');
      if (seenInFile.has(phoneKey)) return errors.push({ row: n, reason: 'Duplicate phone within file' });
      seenInFile.add(phoneKey);
      const fu = row.nextFollowUpDate ? new Date(row.nextFollowUpDate) : undefined;
      toCreate.push({
        leadId: row.leadId ?? `L-${Date.now().toString(36).toUpperCase()}-${n}`,
        businessName: row.businessName,
        phone: row.phone,
        email: row.email,
        state: row.state,
        city: row.city,
        timezone: row.timezone ?? Timezone.EST,
        status: row.status ?? LeadStatus.new,
        contactName: row.contactName,
        industry: row.industry,
        title: row.title,
        vlc: row.vlc,
        employeeCode: row.employeeCode,
        comments: row.comments,
        leadCategory: row.leadCategory,
        nextFollowUpDate: fu && !isNaN(fu.getTime()) ? fu : undefined,
        caller: row.caller,
      });
    });

    // AI-004 — skip phones that already exist in the DB
    const callerCache = new Map<string, string | undefined>();
    let imported = 0;
    let skipped = 0;
    for (const { caller, ...data } of toCreate) {
      const dupe = await this.prisma.lead.findFirst({
        where: { deletedAt: null, OR: [{ phone: data.phone }, { leadId: data.leadId }] },
        select: { id: true },
      });
      if (dupe) {
        skipped++;
        continue;
      }
      const key = caller?.trim().toLowerCase();
      let assignedToId: string | undefined;
      if (key) {
        if (!callerCache.has(key)) callerCache.set(key, await this.resolveCaller(caller));
        assignedToId = callerCache.get(key);
      }
      await this.prisma.lead.create({
        data: { ...data, ...(assignedToId ? { assignedTo: { connect: { id: assignedToId } } } : {}) },
      });
      imported++;
    }

    // NTF-003 — alert managers that a new batch landed
    if (imported > 0) {
      await this.notifications.notifyManagers(
        'new_leads',
        'New leads uploaded',
        `${imported} new lead(s) were imported.`,
      );
    }

    return { imported, skipped, errors, totalRows: dto.rows.length };
  }

  async findAll(query: ListLeadsQueryDto, user?: { id: string; role: Role }) {
    // RBAC: employees only see leads assigned to them.
    const scope = user?.role === Role.employee ? { assignedToId: user.id } : {};
    return this.prisma.lead.findMany({
      where: { deletedAt: null, status: query.status, state: query.state, ...scope },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
  }

  async findOne(id: string, user?: { id: string; role: Role }) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    // Employees may only open their own assigned leads.
    if (user?.role === Role.employee && lead.assignedToId !== user.id) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }
}
