import { Injectable, NotFoundException } from '@nestjs/common';
import { Timezone, LeadStatus, Role, Prisma } from '@crm/database';
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
  /**
   * IMP-001/005 — bulk upsert. Matches an existing lead by phone (or leadId)
   * and UPDATES only the columns present in the row (missing columns are left
   * untouched), so partial files fill in remaining data. Creates a new lead
   * when no match exists (core fields required only then). Per-row validation
   * — a single bad row never rejects the whole file.
   */
  async bulkImport(dto: ImportLeadsDto) {
    const errors: Array<{ row: number; reason: string }> = [];
    const seenInFile = new Set<string>();
    const callerCache = new Map<string, string | undefined>();
    let imported = 0;
    let updated = 0;

    const resolveAssigned = async (caller?: string) => {
      const key = caller?.trim().toLowerCase();
      if (!key) return undefined;
      if (!callerCache.has(key)) callerCache.set(key, await this.resolveCaller(caller));
      return callerCache.get(key);
    };

    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i];
      const n = i + 1;
      const phoneKey = (row.phone ?? '').replace(/\D/g, '');
      // No required fields — only skip duplicate phones within the same file.
      if (phoneKey) {
        if (seenInFile.has(phoneKey)) {
          errors.push({ row: n, reason: 'Duplicate phone within file' });
          continue;
        }
        seenInFile.add(phoneKey);
      }

      // Only the provided (non-empty) columns; missing columns stay untouched.
      const data: Prisma.LeadUpdateInput = {};
      const setIf = (key: keyof Prisma.LeadUpdateInput, v?: string) => {
        if (v != null && String(v).trim() !== '') (data as Record<string, unknown>)[key] = String(v).trim();
      };
      setIf('businessName', row.businessName);
      setIf('phone', row.phone);
      setIf('email', row.email);
      setIf('state', row.state);
      setIf('city', row.city);
      if (row.timezone) data.timezone = row.timezone as Timezone;
      if (row.status) data.status = row.status as LeadStatus;
      setIf('contactName', row.contactName);
      setIf('industry', row.industry);
      setIf('title', row.title);
      setIf('vlc', row.vlc);
      setIf('employeeCode', row.employeeCode);
      setIf('comments', row.comments);
      setIf('leadCategory', row.leadCategory);
      const fu = row.nextFollowUpDate ? new Date(row.nextFollowUpDate) : undefined;
      if (fu && !isNaN(fu.getTime())) data.nextFollowUpDate = fu;
      // Skip completely empty rows (nothing provided at all).
      if (Object.keys(data).length === 0 && !row.caller?.trim()) continue;

      const assignedToId = await resolveAssigned(row.caller);
      const assignRel = assignedToId ? { assignedTo: { connect: { id: assignedToId } } } : {};

      // Match an existing lead by leadId or phone (last 10 digits), if any.
      const last10 = phoneKey.slice(-10);
      const existing = last10 || row.leadId
        ? await this.prisma.lead.findFirst({
            where: {
              deletedAt: null,
              OR: [...(row.leadId ? [{ leadId: row.leadId }] : []), ...(last10 ? [{ phone: { contains: last10 } }] : [])],
            },
            select: { id: true },
          })
        : null;

      if (existing) {
        await this.prisma.lead.update({ where: { id: existing.id }, data: { ...data, ...assignRel } });
        updated++;
      } else {
        // No required columns: missing core fields default to empty (fill later).
        await this.prisma.lead.create({
          data: {
            leadId: row.leadId ?? `L-${Date.now().toString(36).toUpperCase()}-${n}`,
            businessName: '',
            phone: '',
            state: '',
            city: '',
            timezone: Timezone.EST,
            status: LeadStatus.new,
            ...data,
            ...assignRel,
          } as Prisma.LeadCreateInput,
        });
        imported++;
      }
    }

    // NTF-003 — alert managers that a new batch landed
    if (imported > 0) {
      await this.notifications.notifyManagers(
        'new_leads',
        'New leads uploaded',
        `${imported} new lead(s) were imported.`,
      );
    }

    return { imported, updated, skipped: 0, errors, totalRows: dto.rows.length };
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
