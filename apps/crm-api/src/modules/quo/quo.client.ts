import { Injectable, Logger } from '@nestjs/common';
import { QuoLeadPayload, QuoLeadResponse, QuoCallResult, QuoQueueCallRequest, QuoQueueCallResult } from './quo.types';

/**
 * Low-level HTTP client for Quo. Auth: API key header (per chosen config).
 *
 * Sandbox mode: when QUO_BASE_URL / QUO_API_KEY are not set (or QUO_SANDBOX=true)
 * it simulates Quo so the full flow is demonstrable without real credentials.
 * Set the env vars later to switch to the real API with zero code changes.
 */
@Injectable()
export class QuoClient {
  private readonly logger = new Logger(QuoClient.name);

  private get baseUrl() {
    return process.env.QUO_BASE_URL?.replace(/\/$/, '') ?? '';
  }
  private get apiKey() {
    return process.env.QUO_API_KEY ?? '';
  }
  private get timeoutMs() {
    return Number(process.env.QUO_TIMEOUT_MS ?? 10_000);
  }

  get isSandbox(): boolean {
    return process.env.QUO_SANDBOX === 'true' || !this.baseUrl || !this.apiKey;
  }

  /** The configured Quo call queue (all outbound calls route through it). */
  get queueId(): string {
    return process.env.QUO_QUEUE_ID ?? '';
  }
  get hasQueue(): boolean {
    return !!this.queueId;
  }

  /**
   * Place an outbound call through the configured Quo queue. Quo dials the lead
   * and bridges the agent; the resulting call.* webhook enriches our Call record
   * (status, duration, recording, transcript, AI summary).
   */
  async placeQueuedCall(req: QuoQueueCallRequest): Promise<QuoQueueCallResult> {
    const startedAt = Date.now();
    if (this.isSandbox) {
      await new Promise((r) => setTimeout(r, 120));
      return {
        success: true,
        statusCode: 200,
        data: { id: `quo_call_${Math.random().toString(36).slice(2, 12)}`, status: 'queued', queueId: this.queueId || 'sandbox-queue' },
        durationMs: Date.now() - startedAt,
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      // Endpoint/field names follow Quo's queue-dial spec; adjust when finalized.
      const res = await fetch(`${this.baseUrl}/queues/${encodeURIComponent(this.queueId)}/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey },
        body: JSON.stringify({ to: req.toNumber, agentId: req.agentId, leadId: req.leadId }),
        signal: controller.signal,
      });
      const raw = (await res.json().catch(() => undefined)) as Record<string, unknown> | undefined;
      const durationMs = Date.now() - startedAt;
      if (!res.ok) {
        return { success: false, statusCode: res.status, error: (raw?.message as string) ?? `Quo returned HTTP ${res.status}`, rawResponse: raw, durationMs };
      }
      return {
        success: true,
        statusCode: res.status,
        data: { id: String(raw?.id ?? ''), status: String(raw?.status ?? 'queued'), queueId: this.queueId },
        rawResponse: raw,
        durationMs,
      };
    } catch (err) {
      const e = err as { name?: string; message?: string };
      const aborted = e?.name === 'AbortError';
      this.logger.warn(`Quo queue call failed: ${e?.message}`);
      return { success: false, error: aborted ? `Quo request timed out after ${this.timeoutMs}ms` : e?.message ?? 'Network error', durationMs: Date.now() - startedAt };
    } finally {
      clearTimeout(timer);
    }
  }

  async createLead(payload: QuoLeadPayload): Promise<QuoCallResult> {
    const startedAt = Date.now();

    if (this.isSandbox) {
      return this.sandboxCreateLead(payload, startedAt);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Auth: API key header. Adjust header name to Quo's real spec.
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const raw = await res.json().catch(() => undefined);
      const durationMs = Date.now() - startedAt;

      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          error: (raw as any)?.message ?? `Quo returned HTTP ${res.status}`,
          rawResponse: raw,
          durationMs,
        };
      }

      return {
        success: true,
        statusCode: res.status,
        data: raw as QuoLeadResponse,
        rawResponse: raw,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      const aborted = err?.name === 'AbortError';
      this.logger.warn(`Quo call failed: ${err?.message}`);
      return {
        success: false,
        error: aborted ? `Quo request timed out after ${this.timeoutMs}ms` : err?.message ?? 'Network error',
        durationMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Sandbox simulation ───────────────────────────────────
  private async sandboxCreateLead(payload: QuoLeadPayload, startedAt: number): Promise<QuoCallResult> {
    await new Promise((r) => setTimeout(r, 150)); // simulate latency
    const durationMs = Date.now() - startedAt;

    // Deterministic error hook for testing error handling: any phone ending in
    // "0000" (or businessName containing "FAIL") simulates a Quo rejection.
    const shouldFail = payload.phone.endsWith('0000') || /fail/i.test(payload.businessName);
    if (shouldFail) {
      return {
        success: false,
        statusCode: 422,
        error: 'Quo (sandbox) rejected the lead: invalid or unverifiable phone number',
        rawResponse: { status: 'rejected', message: 'invalid phone' },
        durationMs,
      };
    }

    const data: QuoLeadResponse = {
      id: `quo_${Math.random().toString(36).slice(2, 12)}`,
      status: 'accepted',
      message: 'Lead accepted by Quo (sandbox)',
      receivedAt: new Date().toISOString(),
      echo: payload,
    };
    return { success: true, statusCode: 200, data, rawResponse: data, durationMs };
  }
}
