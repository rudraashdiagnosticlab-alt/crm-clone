import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { CommDirection, Timezone, LeadStatus } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenPhoneService } from '../openphone/openphone.service';

type Json = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const digits = (v: string) => v.replace(/\D/g, '');

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);
  private fallbackAdminId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openphone: OpenPhoneService,
  ) {}

  // ── Webhook signature (HMAC-SHA256 of the raw body) ──
  get webhookSecret() {
    return process.env.QUO_WEBHOOK_SECRET || process.env.OPENPHONE_WEBHOOK_SECRET || '';
  }

  /** Verify a webhook signature. Accepts hex or base64, with optional
   * `sha256=` prefix or OpenPhone's `hmac;v;ts;sig` format (last segment). */
  verifySignature(raw: Buffer | string, signature?: string): boolean {
    const secret = this.webhookSecret;
    if (!secret) {
      this.logger.warn('No QUO_WEBHOOK_SECRET set — accepting webhook unverified (dev only)');
      return true;
    }
    if (!signature) return false;
    const body = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const hex = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const b64 = Buffer.from(hex, 'hex').toString('base64');
    const provided = signature.includes(';') ? signature.split(';').pop()! : signature.replace(/^sha256=/, '');
    const eq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    return eq(provided, hex) || eq(provided, b64);
  }

  // ── Event dispatch ──
  async handleEvent(payload: Json) {
    const type = str(payload.type) ?? '';
    const data = (payload.data as Json) ?? {};
    const obj = ((data.object as Json) ?? data) as Json;
    this.logger.log(`Quo webhook: ${type}`);

    if (type.startsWith('message.')) return this.handleMessage(type, obj);
    if (type.startsWith('call.')) return this.handleCall(type, obj);
    if (type.startsWith('contact.')) return this.handleContact(obj);
    return { ignored: type };
  }

  private async resolveCallerId(assignedToId: string | null): Promise<string> {
    if (assignedToId) return assignedToId;
    if (!this.fallbackAdminId) {
      const admin = await this.prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
      this.fallbackAdminId = admin?.id ?? (await this.prisma.user.findFirst({ select: { id: true } }))!.id;
    }
    return this.fallbackAdminId;
  }

  /** Find a lead by phone (last 10 digits) or create a minimal one. */
  private async findOrCreateLeadByPhone(phone: string) {
    const last10 = digits(phone).slice(-10);
    let lead = last10
      ? await this.prisma.lead.findFirst({ where: { deletedAt: null, phone: { contains: last10 } } })
      : null;
    if (!lead) {
      lead = await this.prisma.lead.create({
        data: {
          leadId: `L-${Date.now().toString(36).toUpperCase()}`,
          businessName: 'Unknown caller',
          phone,
          state: 'Unknown',
          city: 'Unknown',
          timezone: Timezone.EST,
          status: LeadStatus.new,
        },
      });
      this.logger.log(`Created lead from unknown caller ${phone}`);
    }
    return lead;
  }

  private dir(v: unknown): CommDirection {
    return v === 'incoming' || v === 'inbound' ? CommDirection.inbound : CommDirection.outbound;
  }

  private async touchLead(leadId: string) {
    await this.prisma.lead.update({ where: { id: leadId }, data: { lastCommunicationAt: new Date() } });
  }

  // ── Messages (SMS) ──
  private async handleMessage(type: string, o: Json) {
    const direction = this.dir(o.direction);
    const from = str(o.from) ?? '';
    const to = Array.isArray(o.to) ? str(o.to[0]) ?? '' : str(o.to) ?? '';
    const external = direction === CommDirection.inbound ? from : to;
    if (!external) return { ignored: 'no phone' };

    const lead = await this.findOrCreateLeadByPhone(external);
    const quoMessageId = str(o.id);
    const status = str(o.status) ?? (type === 'message.received' ? 'received' : 'sent');
    const body = str(o.body) ?? str(o.text) ?? '';

    const existing = quoMessageId
      ? await this.prisma.message.findFirst({ where: { quoMessageId } })
      : null;
    if (existing) {
      await this.prisma.message.update({ where: { id: existing.id }, data: { status } });
    } else {
      await this.prisma.message.create({
        data: { leadId: lead.id, direction, body, fromNumber: from, toNumber: to, status, quoMessageId, conversationId: str(o.conversationId) },
      });
    }
    await this.touchLead(lead.id);
    return { ok: true, leadId: lead.id };
  }

  // ── Calls ──
  private async handleCall(type: string, o: Json) {
    const quoCallId = str(o.id);
    const existing = quoCallId ? await this.prisma.call.findFirst({ where: { quoCallId } }) : null;

    // Recording / transcript / summary events just enrich the existing call.
    const recordingUrl = str(o.recordingUrl) ?? str((o.recording as Json)?.url);
    const transcript = str(o.transcript) ?? str((o.transcript as Json)?.text);
    const aiSummary = str(o.summary) ?? str((o.aiSummary as Json)?.text) ?? str(o.aiSummary);
    if (existing && (type.includes('recording') || type.includes('transcript') || type.includes('summary'))) {
      await this.prisma.call.update({
        where: { id: existing.id },
        data: { recordingUrl: recordingUrl ?? undefined, transcript: transcript ?? undefined, aiSummary: aiSummary ?? undefined },
      });
      return { ok: true, callId: existing.id };
    }

    const direction = this.dir(o.direction);
    const from = str(o.from) ?? '';
    const to = Array.isArray(o.to) ? str(o.to[0]) ?? '' : str(o.to) ?? '';
    const external = direction === CommDirection.inbound ? from : to;
    if (!external) return { ignored: 'no phone' };

    const lead = await this.findOrCreateLeadByPhone(external);
    const callerId = await this.resolveCallerId(lead.assignedToId);
    const durationSecs = typeof o.duration === 'number' ? (o.duration as number) : undefined;
    const status = str(o.status) ?? '';
    const startTime = o.createdAt ? new Date(o.createdAt as string) : new Date();

    let callId: string;
    if (existing) {
      const upd = await this.prisma.call.update({
        where: { id: existing.id },
        data: { status, durationSecs, recordingUrl: recordingUrl ?? undefined, transcript: transcript ?? undefined, aiSummary: aiSummary ?? undefined, endTime: new Date() },
      });
      callId = upd.id;
    } else {
      const created = await this.prisma.call.create({
        data: {
          leadId: lead.id, callerId, direction, status, durationSecs,
          recordingUrl: recordingUrl ?? undefined, transcript: transcript ?? undefined, aiSummary: aiSummary ?? undefined,
          quoCallId, conversationId: str(o.conversationId),
          startTime, endTime: durationSecs != null ? new Date() : null,
        },
      });
      callId = created.id;
    }
    await this.touchLead(lead.id);

    // Workflow: missed inbound call → follow-up task for the owner.
    const missed = ['missed', 'no-answer', 'no_answer'].includes(status) || (direction === CommDirection.inbound && durationSecs === 0);
    if (missed) {
      const ownerId = await this.resolveCallerId(lead.assignedToId);
      await this.prisma.task.create({
        data: { title: `Follow up: missed call from ${lead.businessName} (${external})`, ownerId, priority: 'high' },
      });
    }
    return { ok: true, callId, missed };
  }

  // ── Contacts ──
  private async handleContact(o: Json) {
    const phones = Array.isArray(o.phoneNumbers) ? o.phoneNumbers : [];
    const phone = str(o.phoneNumber) ?? str((phones[0] as Json)?.value) ?? str(phones[0]);
    if (!phone) return { ignored: 'no phone' };
    const lead = await this.findOrCreateLeadByPhone(phone);
    await this.prisma.lead.update({ where: { id: lead.id }, data: { quoContactId: str(o.id) } });
    return { ok: true, leadId: lead.id };
  }

  // ── Outbound: SMS ──
  /** Send an SMS to a lead and record it on the timeline. */
  async sendSms(leadId: string, body: string, from?: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (!body?.trim()) throw new BadRequestException('Message body is required');

    // Resolve a "from" number: explicit, else the first workspace number.
    let fromNumber = from;
    if (!fromNumber) {
      const status = await this.openphone.status();
      fromNumber = status.phoneNumbers[0]?.number;
    }
    if (!fromNumber) throw new BadRequestException('No OpenPhone number available to send from');

    const result = await this.openphone.sendSms({ from: fromNumber, to: [lead.phone], content: body });
    const data = result.data as { id?: string; status?: string } | undefined;
    const message = await this.prisma.message.create({
      data: {
        leadId: lead.id,
        direction: CommDirection.outbound,
        body,
        fromNumber,
        toNumber: lead.phone,
        status: result.success ? data?.status ?? 'queued' : 'failed',
        quoMessageId: data?.id,
      },
    });
    await this.touchLead(lead.id);
    return { success: result.success, message, error: result.success ? null : result.error ?? null };
  }

  // ── Outbound: click-to-call ──
  /** Log an outbound call attempt and return a tel: link for the agent's dialer.
   * The call is enriched later by the provider's call.completed webhook. */
  async startCall(leadId: string, callerId: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');

    const call = await this.prisma.call.create({
      data: {
        leadId: lead.id,
        callerId,
        direction: CommDirection.outbound,
        status: 'initiated',
        startTime: new Date(),
      },
    });
    await this.touchLead(lead.id);
    return { callId: call.id, tel: `tel:${lead.phone}`, phone: lead.phone };
  }

  // ── Unified conversation timeline for a lead ──
  async getTimeline(leadId: string) {
    const [calls, messages, notes] = await Promise.all([
      this.prisma.call.findMany({ where: { leadId }, include: { caller: { select: { name: true } } }, orderBy: { startTime: 'desc' }, take: 100 }),
      this.prisma.message.findMany({ where: { leadId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.note.findMany({ where: { leadId }, include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ]);

    const items = [
      ...calls.map((c) => ({
        kind: 'call' as const, id: c.id, at: c.startTime, direction: c.direction, status: c.status,
        durationSecs: c.durationSecs, recordingUrl: c.recordingUrl, transcript: c.transcript, aiSummary: c.aiSummary, by: c.caller?.name ?? null,
      })),
      ...messages.map((m) => ({ kind: 'message' as const, id: m.id, at: m.createdAt, direction: m.direction, body: m.body, status: m.status })),
      ...notes.map((n) => ({ kind: 'note' as const, id: n.id, at: n.createdAt, body: n.noteText, by: n.createdBy?.name ?? null })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return items;
  }
}
