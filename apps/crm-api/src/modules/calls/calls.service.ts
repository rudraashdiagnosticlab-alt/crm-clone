import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CallOutcome, LeadStatus } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';
import { StartCallDto, EndCallDto, CreateNoteDto } from './dto/call.dto';

// CAL-014 — map a call disposition to the resulting lead status.
const OUTCOME_TO_STATUS: Record<CallOutcome, LeadStatus> = {
  closed_deal: LeadStatus.closed,
  interested: LeadStatus.interested,
  callback: LeadStatus.contacted,
  no_answer: LeadStatus.in_progress,
  busy: LeadStatus.in_progress,
  follow_up_required: LeadStatus.contacted,
  wrong_number: LeadStatus.rejected,
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  // CAL-008 — start call: create record, mark lead in progress
  async start(dto: StartCallDto, callerId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');
    const call = await this.prisma.call.create({
      data: { leadId: dto.leadId, callerId, startTime: new Date() },
    });
    if (lead.status === 'new') {
      await this.prisma.lead.update({ where: { id: lead.id }, data: { status: 'in_progress' } });
    }
    return call;
  }

  // CAL-009/010 — end call: compute duration, store outcome, update lead status
  async end(callId: string, dto: EndCallDto, callerId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found');
    if (call.callerId !== callerId) throw new ForbiddenException('Not your call');

    const endTime = new Date();
    const durationSecs =
      dto.durationSecs ?? Math.max(0, Math.round((endTime.getTime() - call.startTime.getTime()) / 1000));

    const [updated] = await this.prisma.$transaction([
      this.prisma.call.update({
        where: { id: callId },
        data: { endTime, durationSecs, outcome: dto.outcome, recordingUrl: dto.recordingUrl },
      }),
      this.prisma.lead.update({
        where: { id: call.leadId },
        data: { status: OUTCOME_TO_STATUS[dto.outcome] },
      }),
      this.prisma.activity.create({
        data: {
          leadId: call.leadId,
          userId: callerId,
          action: 'call_completed',
          newValue: dto.outcome,
        },
      }),
    ]);
    return updated;
  }

  // CAL-012/013 — note after a call (lead resolved from the call record)
  async addNoteToCall(callId: string, dto: CreateNoteDto, userId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException('Call not found');
    return this.prisma.note.create({
      data: {
        leadId: call.leadId,
        callId,
        noteText: dto.noteText,
        nextFollowupDate: dto.nextFollowupDate ? new Date(dto.nextFollowupDate) : undefined,
        createdById: userId,
      },
    });
  }

  // CAL-015 — call + note history for a lead
  history(leadId: string) {
    return this.prisma.call.findMany({
      where: { leadId },
      orderBy: { startTime: 'desc' },
      include: {
        caller: { select: { id: true, name: true } },
        notes: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  // CAL-001..005 — caller dashboard KPIs
  async callerDashboard(callerId: string) {
    const today = startOfToday();
    const [assigned, todaysCalls] = await Promise.all([
      this.prisma.lead.count({ where: { assignedToId: callerId, deletedAt: null } }),
      this.prisma.call.findMany({
        where: { callerId, endTime: { gte: today } },
        select: { durationSecs: true },
      }),
    ]);
    const callsCompleted = todaysCalls.length;
    const productiveSecs = todaysCalls.reduce((a, c) => a + (c.durationSecs ?? 0), 0);
    const avgCallSecs = callsCompleted > 0 ? Math.round(productiveSecs / callsCompleted) : 0;
    return {
      assignedLeads: assigned,
      callsCompleted,
      pendingLeads: Math.max(assigned - callsCompleted, 0),
      productiveSecs,
      avgCallSecs,
    };
  }

  // CAL-016/017 — next unworked assigned lead (lowest leadId, skip closed/rejected)
  async nextLead(callerId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        assignedToId: callerId,
        deletedAt: null,
        status: { notIn: ['closed', 'rejected'] },
      },
      orderBy: [{ status: 'asc' }, { leadId: 'asc' }],
    });
    return lead ?? null;
  }

  // CAL-006 — caller's assigned lead queue
  myLeads(callerId: string) {
    return this.prisma.lead.findMany({
      where: { assignedToId: callerId, deletedAt: null },
      orderBy: { leadId: 'asc' },
      take: 200,
    });
  }
}
