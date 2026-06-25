// Contract for the Quo lead integration. The real Quo API shape is unknown, so
// these are our assumed request/response types — adjust the field mapping in
// QuoClient once the real spec is available. Everything else stays the same.

export interface QuoLeadPayload {
  externalId: string; // our lead.id
  businessName: string;
  phone: string;
  email?: string | null;
  state: string;
  city: string;
  timezone: string;
}

export interface QuoLeadResponse {
  /** Quo's identifier for the created/updated lead. */
  id: string;
  status: string; // e.g. "accepted" | "queued" | "rejected"
  message?: string;
  [key: string]: unknown; // tolerate extra fields
}

/** Normalized result returned by QuoClient to the service. */
export interface QuoCallResult {
  success: boolean;
  statusCode?: number;
  data?: QuoLeadResponse;
  error?: string;
  rawResponse?: unknown;
  durationMs: number;
}

/** Request to place an outbound call through a Quo call queue. */
export interface QuoQueueCallRequest {
  toNumber: string; // the lead's phone
  leadId?: string; // our lead id (echoed back on the call.* webhook)
  agentId?: string; // the CRM caller placing the call
}

/** Quo's acknowledgement of a queued call. */
export interface QuoQueueCallResult {
  success: boolean;
  statusCode?: number;
  data?: { id: string; status: string; queueId: string };
  error?: string;
  rawResponse?: unknown;
  durationMs: number;
}
