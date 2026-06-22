/** A phone number provisioned in the connected OpenPhone workspace. */
export interface OpenPhoneNumber {
  id: string;
  number: string; // E.164
  name?: string;
}

/** Outbound SMS payload (OpenPhone POST /messages). */
export interface OpenPhoneMessagePayload {
  from: string; // an OpenPhone number / id
  to: string[]; // recipient E.164 numbers
  content: string;
}

/** Normalized result envelope for any OpenPhone call. */
export interface OpenPhoneResult<T = unknown> {
  success: boolean;
  statusCode?: number;
  data?: T;
  error?: string;
  durationMs: number;
}
