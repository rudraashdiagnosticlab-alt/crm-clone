import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OutcomesService } from '../outcomes/outcomes.service';
import { StartCallDto, EndCallDto, CreateNoteDto, UpdateFollowupDto } from './dto/call.dto';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly outcomesService: OutcomesService,
  ) {}

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

    // Resolve the configurable outcome — drives lead status + callback workflow.
    const oc = await this.outcomesService.bySlug(dto.outcome);
    const schedulesCallback = oc?.schedulesCallback ?? false;

    const [updated] = await this.prisma.$transaction([
      this.prisma.call.update({
        where: { id: callId },
        data: { endTime, durationSecs, outcome: dto.outcome, recordingUrl: dto.recordingUrl },
      }),
      this.prisma.lead.update({
        where: { id: call.leadId },
        data: {
          ...(oc?.leadStatus ? { status: oc.leadStatus } : {}),
          ...(schedulesCallback
            ? {
                // (Re)schedule a callback — reset reminder stamps so the cron
                // fires fresh reminders for the new date.
                callbackAt: dto.callbackAt ? new Date(dto.callbackAt) : null,
                callbackCompletedAt: null,
                callbackReminderDayBeforeAt: null,
                callbackReminderDueAt: null,
                callbackReminderMissedAt: null,
              }
            : // Any other completed outcome clears the pin (removes it from the
              // pinned section / calling queue once the outcome is updated).
              { callbackCompletedAt: new Date() }),
        },
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

    const lead = await this.prisma.lead.findUnique({
      where: { id: call.leadId },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });
    if (lead && schedulesCallback && dto.callbackAt) {
      const callbackText = `A callback for ${lead.businessName} is scheduled for ${new Date(dto.callbackAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}.`;
      await this.notifications.notifyAndEmail(
        lead.assignedToId,
        'callback_reminder',
        `Callback scheduled for ${lead.businessName}`,
        callbackText,
        { email: lead.assignedTo?.email ?? null, alsoManagers: true },
      );
    }
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
        ...(dto.callbackAt ? { nextFollowupDate: new Date(dto.callbackAt) } : {}),
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

  // CAL-013 — upcoming follow-ups (notes with a next follow-up date).
  // Employees only see follow-ups for their own assigned leads; managers see
  // all and may filter by a specific caller via `userId`.
  async followups(current: { id: string; role: Role }, userId?: string) {
    const isManager = current.role === Role.admin || current.role === Role.team_leader;
    const targetUserId = isManager ? userId : current.id; // employees forced to own
    const [notes, leads] = await Promise.all([
      this.prisma.note.findMany({
        where: {
          nextFollowupDate: { not: null },
          ...(targetUserId ? { lead: { assignedToId: targetUserId } } : {}),
        },
        orderBy: { nextFollowupDate: 'asc' },
        take: 50,
        select: {
          id: true,
          noteText: true,
          nextFollowupDate: true,
          lead: { select: { id: true, businessName: true, phone: true, city: true, state: true, timezone: true, status: true, callbackAt: true, callbackCompletedAt: true } },
          createdBy: { select: { name: true } },
        },
      }),
      this.prisma.lead.findMany({
        where: {
          callbackAt: { not: null },
          callbackCompletedAt: null,
          deletedAt: null,
          ...(targetUserId ? { assignedToId: targetUserId } : {}),
        },
        orderBy: { callbackAt: 'asc' },
        take: 50,
        select: {
          id: true,
          businessName: true,
          phone: true,
          city: true,
          state: true,
          timezone: true,
          status: true,
          callbackAt: true,
          callbackCompletedAt: true,
          assignedTo: { select: { name: true } },
        },
      }),
    ]);
    return [
      ...notes.map((n) => ({
        kind: 'note' as const,
        id: n.id,
        noteText: n.noteText,
        nextFollowupDate: n.nextFollowupDate,
        caller: n.createdBy?.name ?? null,
        completedAt: null,
        lead: n.lead,
      })),
      ...leads.map((l) => ({
        kind: 'lead' as const,
        id: l.id,
        noteText: `Callback for ${l.businessName}`,
        nextFollowupDate: l.callbackAt,
        caller: l.assignedTo?.name ?? null,
        completedAt: l.callbackCompletedAt,
        lead: {
          id: l.id,
          businessName: l.businessName,
          phone: l.phone,
          city: l.city,
          state: l.state,
          timezone: l.timezone,
          status: l.status,
          callbackAt: l.callbackAt,
          callbackCompletedAt: l.callbackCompletedAt,
        },
      })),
    ].sort((a, b) => {
      const at = a.nextFollowupDate ? new Date(a.nextFollowupDate).getTime() : 0;
      const bt = b.nextFollowupDate ? new Date(b.nextFollowupDate).getTime() : 0;
      return at - bt;
    });
  }

  async updateFollowup(kind: 'note' | 'lead', id: string, dto: UpdateFollowupDto, userId: string) {
    if (kind === 'note') {
      const note = await this.prisma.note.findUnique({ where: { id } });
      if (!note) throw new NotFoundException('Follow-up not found');
      return this.prisma.note.update({
        where: { id },
        data: {
          ...(dto.noteText !== undefined ? { noteText: dto.noteText } : {}),
          ...(dto.followUpAt !== undefined ? { nextFollowupDate: dto.followUpAt ? new Date(dto.followUpAt) : null } : {}),
        },
      });
    }

    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Follow-up not found');
    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.followUpAt !== undefined ? { callbackAt: dto.followUpAt ? new Date(dto.followUpAt) : null } : {}),
        callbackCompletedAt: null,
      },
    });
    await this.prisma.activity.create({
      data: {
        leadId: id,
        userId,
        action: 'updated',
        oldValue: lead.callbackAt?.toISOString() ?? null,
        newValue: dto.followUpAt ?? null,
      },
    });
    return updated;
  }

  async completeFollowup(kind: 'note' | 'lead', id: string, userId: string) {
    if (kind === 'note') {
      const note = await this.prisma.note.findUnique({ where: { id } });
      if (!note) throw new NotFoundException('Follow-up not found');
      await this.prisma.activity.create({
        data: { leadId: note.leadId, userId, action: 'completed', oldValue: note.nextFollowupDate?.toISOString() ?? null, newValue: null },
      });
      return this.prisma.note.update({ where: { id }, data: { nextFollowupDate: null } });
    }

    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Follow-up not found');
    await this.prisma.activity.create({
      data: { leadId: id, userId, action: 'completed', oldValue: lead.callbackAt?.toISOString() ?? null, newValue: null },
    });
    return this.prisma.lead.update({ where: { id }, data: { callbackCompletedAt: new Date() } });
  }

  async outcomes(
    query: { from?: string; to?: string; outcome?: string; userId?: string },
    current: { id: string; role: Role },
  ) {
    // Employees see only their own outcomes; managers/admins see all and may
    // filter by a specific caller (req 6 dashboard).
    const isManager = current.role === Role.admin || current.role === Role.team_leader;
    const callerId = isManager ? query.userId : current.id;
    return this.prisma.call.findMany({
      where: {
        ...(callerId ? { callerId } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lt: new Date(query.to) } : {}),
              },
            }
          : {}),
        ...(query.outcome ? { outcome: query.outcome } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        outcome: true,
        createdAt: true,
        lead: {
          select: { id: true, businessName: true, phone: true, status: true, callbackAt: true, callbackCompletedAt: true },
        },
        caller: { select: { id: true, name: true, email: true } },
      },
    });
  }

  // CAL-006 — caller's assigned lead queue.
  // Single queue ordering:
  //   0 — today's PENDING callbacks (pinned, stay until completed/rescheduled)
  //   1 — active/ongoing calls (newest first — a new/received call jumps to top)
  //   2 — backlog: leads not yet called/handled (waiting)
  //   3 — completed/closed (pushed to the bottom, kept with their outcome/status)
  async myLeads(callerId: string) {
    const startOfDay = startOfToday();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const isToday = (d?: Date | null) => !!d && d >= startOfDay && d <= endOfToday;

    const leads = await this.prisma.lead.findMany({
      where: { assignedToId: callerId, deletedAt: null },
      orderBy: { leadId: 'asc' },
      take: 200,
    });

    // Most recent call per lead made today, to derive each lead's call state.
    const calls = await this.prisma.call.findMany({
      where: { callerId, startTime: { gte: startOfDay, lte: endOfToday } },
      orderBy: { startTime: 'desc' },
      select: { leadId: true, startTime: true, endTime: true, outcome: true },
    });
    const latestByLead = new Map<string, { startTime: Date; endTime: Date | null; outcome: string | null }>();
    for (const c of calls) {
      if (!latestByLead.has(c.leadId)) latestByLead.set(c.leadId, c); // desc order → first seen is newest
    }

    const enriched = leads.map((l) => {
      const call = latestByLead.get(l.id) ?? null;
      return {
        ...l,
        lastCallAt: call?.startTime ?? null,
        lastCallEndedAt: call?.endTime ?? null,
        lastOutcome: call?.outcome ?? null,
      };
    });
    type Row = (typeof enriched)[number];

    const rank = (l: Row) => {
      const closed = l.status === 'closed' || l.status === 'rejected';
      if (!l.callbackCompletedAt && isToday(l.callbackAt)) return 0; // today's pending callback (pinned)
      if (l.lastCallAt && !l.lastCallEndedAt) return 1; // call in progress / ongoing
      if (l.lastCallEndedAt || closed) return 3; // completed call or closed lead → bottom
      return 2; // backlog: waiting / not yet handled
    };

    return enriched.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return (a.callbackAt?.getTime() ?? 0) - (b.callbackAt?.getTime() ?? 0);
      if (ra === 1) return (b.lastCallAt?.getTime() ?? 0) - (a.lastCallAt?.getTime() ?? 0);
      if (ra === 3) return (b.lastCallEndedAt?.getTime() ?? 0) - (a.lastCallEndedAt?.getTime() ?? 0);
      return a.leadId.localeCompare(b.leadId);
    });
  }
}
