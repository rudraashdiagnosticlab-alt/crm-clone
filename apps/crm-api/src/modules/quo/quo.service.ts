import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Prisma, QuoSyncStatus } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';
import { QuoClient } from './quo.client';
import { QuoLeadPayload } from './quo.types';

/**
 * Orchestrates the Lead → Quo sync: build payload → call Quo → persist response
 * (or error) on the lead → write an audit log row. This is the reusable pattern
 * for Contacts/Deals/Accounts/etc.
 */
@Injectable()
export class QuoService {
  private readonly logger = new Logger(QuoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: QuoClient,
  ) {}

  get sandboxMode() {
    return this.client.isSandbox;
  }

  async syncLead(leadId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');

    // mark in-flight
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { quoStatus: QuoSyncStatus.pending },
    });

    const payload: QuoLeadPayload = {
      externalId: lead.id,
      businessName: lead.businessName,
      phone: lead.phone,
      email: lead.email,
      state: lead.state,
      city: lead.city,
      timezone: lead.timezone,
    };

    const result = await this.client.createLead(payload);

    // Persist result on the lead + write the audit log in one transaction.
    const [updated] = await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: leadId },
        data: result.success
          ? {
              quoStatus: QuoSyncStatus.synced,
              quoExternalId: result.data?.id ?? null,
              quoResponse: (result.rawResponse ?? Prisma.DbNull) as Prisma.InputJsonValue,
              quoError: null,
              quoSyncedAt: new Date(),
            }
          : {
              quoStatus: QuoSyncStatus.failed,
              quoError: result.error ?? 'Unknown error',
              quoResponse: (result.rawResponse ?? Prisma.DbNull) as Prisma.InputJsonValue,
            },
      }),
      this.prisma.quoSyncLog.create({
        data: {
          leadId,
          success: result.success,
          statusCode: result.statusCode ?? null,
          request: payload as unknown as Prisma.InputJsonValue,
          response: (result.rawResponse ?? Prisma.DbNull) as Prisma.InputJsonValue,
          error: result.error ?? null,
          durationMs: result.durationMs,
        },
      }),
    ]);

    return {
      success: result.success,
      sandbox: this.client.isSandbox,
      quoStatus: updated.quoStatus,
      quoExternalId: updated.quoExternalId,
      quoSyncedAt: updated.quoSyncedAt,
      error: updated.quoError,
      response: result.data ?? result.rawResponse,
    };
  }

  /** Sync history for the Lead Details page. */
  async getLogs(leadId: string) {
    return this.prisma.quoSyncLog.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
