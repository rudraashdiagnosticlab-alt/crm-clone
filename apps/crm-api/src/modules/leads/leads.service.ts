import { Injectable, NotFoundException } from '@nestjs/common';
import { Timezone, LeadStatus } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateLeadDto, ImportLeadsDto, ListLeadsQueryDto } from './dto/lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateLeadDto) {
    // IMP-006 — auto-generate lead_id if not provided
    const leadId = dto.leadId ?? `L-${Date.now().toString(36).toUpperCase()}`;
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
      toCreate.push({
        leadId: row.leadId ?? `L-${Date.now().toString(36).toUpperCase()}-${n}`,
        businessName: row.businessName,
        phone: row.phone,
        email: row.email,
        state: row.state,
        city: row.city,
        timezone: row.timezone ?? Timezone.EST,
        status: row.status ?? LeadStatus.new,
      });
    });

    // AI-004 — skip phones that already exist in the DB
    let imported = 0;
    let skipped = 0;
    for (const data of toCreate) {
      const dupe = await this.prisma.lead.findFirst({
        where: { deletedAt: null, OR: [{ phone: data.phone }, { leadId: data.leadId }] },
        select: { id: true },
      });
      if (dupe) {
        skipped++;
        continue;
      }
      await this.prisma.lead.create({ data });
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

  async findAll(query: ListLeadsQueryDto) {
    return this.prisma.lead.findMany({
      where: { deletedAt: null, status: query.status, state: query.state },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
