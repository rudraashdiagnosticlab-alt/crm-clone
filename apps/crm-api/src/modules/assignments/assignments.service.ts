import { Injectable } from '@nestjs/common';
import { Prisma } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';
import { ManualAssignDto, AutoAssignDto, AssignStrategy } from './dto/assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** RES-002 — per-caller active assignment counts (e.g. Frank = 200). */
  async summary() {
    const callers = await this.prisma.user.findMany({
      where: { role: 'employee', isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
    const counts = await this.prisma.lead.groupBy({
      by: ['assignedToId'],
      where: { deletedAt: null, assignedToId: { not: null } },
      _count: { _all: true },
    });
    const map = new Map(counts.map((c) => [c.assignedToId, c._count._all]));
    const unassigned = await this.prisma.lead.count({
      where: { deletedAt: null, assignedToId: null },
    });
    return {
      unassigned,
      callers: callers.map((c) => ({ ...c, leadCount: map.get(c.id) ?? 0 })),
    };
  }

  /** Assign a batch of leads to one caller, recording assignment history. */
  async assignMany(leadIds: string[], callerId: string, assignedById: string, batchName?: string) {
    // Snapshot prior owners so we can label new assignment vs. reassignment.
    const prior = await this.prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, assignedToId: true },
    });
    const caller = await this.prisma.user.findUnique({ where: { id: callerId }, select: { name: true } });
    const priorById = new Map(prior.map((p) => [p.id, p.assignedToId]));

    await this.prisma.$transaction([
      // close prior active assignments for these leads
      this.prisma.assignment.updateMany({
        where: { leadId: { in: leadIds }, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.lead.updateMany({
        where: { id: { in: leadIds } },
        data: { assignedToId: callerId },
      }),
      this.prisma.assignment.createMany({
        data: leadIds.map((leadId) => ({ leadId, callerId, assignedById, batchName })),
      }),
      // Lead Activity Log entry per lead (admin/TL audit trail).
      this.prisma.activity.createMany({
        data: leadIds
          .filter((leadId) => priorById.get(leadId) !== callerId) // skip no-op re-assigns to same owner
          .map((leadId) => {
            const had = !!priorById.get(leadId);
            return {
              leadId,
              userId: assignedById,
              action: had ? 'lead_reassigned' : 'lead_assigned',
              oldValue: priorById.get(leadId) ?? null,
              newValue: callerId,
              remarks: `${had ? 'Reassigned' : 'Assigned'} to ${caller?.name ?? 'caller'}${batchName ? ` (batch: ${batchName})` : ''}`,
            };
          }),
      }),
    ]);
    return { assigned: leadIds.length, callerId };
  }

  manual(dto: ManualAssignDto, assignedById: string) {
    return this.assignMany(dto.leadIds, dto.callerId, assignedById, dto.batchName);
  }

  /** RES-003..005 — auto-distribute unassigned leads across callers. */
  async auto(dto: AutoAssignDto, assignedById: string) {
    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      assignedToId: null,
      timezone: dto.timezone,
      state: dto.state,
    };
    const leads = await this.prisma.lead.findMany({
      where,
      select: { id: true, state: true, timezone: true },
      orderBy: { leadId: 'asc' },
    });
    if (leads.length === 0) return { assigned: 0, perCaller: {} };

    const callers = dto.callerIds;
    const buckets = new Map<string, string[]>(callers.map((c) => [c, []]));

    if (dto.strategy === AssignStrategy.equal) {
      // round-robin every lead
      leads.forEach((lead, i) => buckets.get(callers[i % callers.length])!.push(lead.id));
    } else {
      // group leads by state or timezone, then round-robin whole groups to callers
      const key = dto.strategy === AssignStrategy.state ? 'state' : 'timezone';
      const groups = new Map<string, string[]>();
      for (const lead of leads) {
        const g = lead[key];
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(lead.id);
      }
      [...groups.values()].forEach((ids, i) => {
        const caller = callers[i % callers.length];
        buckets.get(caller)!.push(...ids);
      });
    }

    const perCaller: Record<string, number> = {};
    for (const [callerId, ids] of buckets) {
      if (ids.length) {
        await this.assignMany(ids, callerId, assignedById, dto.batchName);
        perCaller[callerId] = ids.length;
      }
    }
    return { assigned: leads.length, perCaller };
  }
}
