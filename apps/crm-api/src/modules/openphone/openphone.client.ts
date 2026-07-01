import { Injectable, Logger } from '@nestjs/common';
import { OpenPhoneNumber, OpenPhoneMessagePayload, OpenPhoneResult, OpenPhoneContactPayload, OpenPhoneContact } from './openphone.types';

/**
 * Low-level HTTP client for OpenPhone (https://www.openphone.com/docs/).
 * Auth: the API key is sent in the `Authorization` header (no Bearer prefix).
 *
 * Sandbox mode: when OPENPHONE_API_KEY is not set (or OPENPHONE_SANDBOX=true)
 * it simulates OpenPhone so the integration is demonstrable without real
 * credentials. Set the env var later to switch to the live API — no code change.
 */
@Injectable()
export class OpenPhoneClient {
  private readonly logger = new Logger(OpenPhoneClient.name);

  private get baseUrl() {
    return (process.env.OPENPHONE_BASE_URL || 'https://api.openphone.com/v1').replace(/\/$/, '');
  }
  private get apiKey() {
    return process.env.OPENPHONE_API_KEY ?? '';
  }
  private get timeoutMs() {
    return Number(process.env.OPENPHONE_TIMEOUT_MS ?? 10_000);
  }

  get isSandbox(): boolean {
    return process.env.OPENPHONE_SANDBOX === 'true' || !this.apiKey;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<OpenPhoneResult<T>> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey, // OpenPhone uses the raw key (no "Bearer ")
          ...(init?.headers ?? {}),
        },
        signal: controller.signal,
      });
      const raw = await res.json().catch(() => undefined);
      const durationMs = Date.now() - startedAt;
      if (!res.ok) {
        return {
          success: false,
          statusCode: res.status,
          error: (raw as { message?: string })?.message ?? `OpenPhone returned HTTP ${res.status}`,
          durationMs,
        };
      }
      return { success: true, statusCode: res.status, data: raw as T, durationMs };
    } catch (err) {
      const durationMs = Date.now() - startedAt;
      const e = err as { name?: string; message?: string };
      const aborted = e?.name === 'AbortError';
      this.logger.warn(`OpenPhone call failed: ${e?.message}`);
      return {
        success: false,
        error: aborted ? `OpenPhone request timed out after ${this.timeoutMs}ms` : e?.message ?? 'Network error',
        durationMs,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** List workspace phone numbers — also used to verify the connection. */
  async listPhoneNumbers(): Promise<OpenPhoneResult<OpenPhoneNumber[]>> {
    if (this.isSandbox) {
      await new Promise((r) => setTimeout(r, 120));
      return {
        success: true,
        statusCode: 200,
        data: [
          { id: 'op_sandbox_1', number: '+13055550100', name: 'Sandbox Main Line' },
          { id: 'op_sandbox_2', number: '+14155550199', name: 'Sandbox Sales Line' },
        ],
        durationMs: 120,
      };
    }
    // OpenPhone returns { data: [{ id, phoneNumber/ number, name }] }
    const res = await this.request<{ data?: Array<{ id: string; number?: string; phoneNumber?: string; name?: string }> }>(
      '/phone-numbers',
      { method: 'GET' },
    );
    if (!res.success) return res as OpenPhoneResult<OpenPhoneNumber[]>;
    const data = (res.data?.data ?? []).map((n) => ({ id: n.id, number: n.number ?? n.phoneNumber ?? '', name: n.name }));
    return { ...res, data };
  }

  /** Send an SMS via OpenPhone. */
  async sendMessage(payload: OpenPhoneMessagePayload): Promise<OpenPhoneResult> {
    if (this.isSandbox) {
      await new Promise((r) => setTimeout(r, 120));
      return { success: true, statusCode: 202, data: { id: `op_msg_${Math.random().toString(36).slice(2, 10)}`, status: 'queued' }, durationMs: 120 };
    }
    return this.request('/messages', { method: 'POST', body: JSON.stringify(payload) });
  }

  /** Create (upsert) a contact in the OpenPhone workspace — used for lead sync. */
  async createContact(payload: OpenPhoneContactPayload): Promise<OpenPhoneResult<OpenPhoneContact>> {
    if (this.isSandbox) {
      await new Promise((r) => setTimeout(r, 150));
      // Deterministic error hook for testing: a phone ending "0000" is rejected.
      const phone = payload.defaultFields.phoneNumbers?.[0]?.value ?? '';
      if (phone.endsWith('0000')) {
        return { success: false, statusCode: 422, error: 'OpenPhone (sandbox) rejected the contact: invalid phone number', durationMs: 150 };
      }
      return {
        success: true,
        statusCode: 201,
        data: { id: `op_ct_${Math.random().toString(36).slice(2, 12)}`, externalId: payload.externalId ?? null },
        durationMs: 150,
      };
    }
    // OpenPhone returns { data: { id, externalId, defaultFields, ... } }
    const res = await this.request<{ data?: OpenPhoneContact }>('/contacts', { method: 'POST', body: JSON.stringify(payload) });
    if (!res.success) return res as OpenPhoneResult<OpenPhoneContact>;
    return { ...res, data: res.data?.data };
  }
}
