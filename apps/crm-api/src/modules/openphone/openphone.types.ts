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

/** Create-contact payload (OpenPhone POST /contacts). */
export interface OpenPhoneContactPayload {
  defaultFields: {
    firstName?: string;
    lastName?: string;
    company?: string;
    phoneNumbers?: { name?: string; value: string }[];
    emails?: { name?: string; value: string }[];
  };
  externalId?: string; // our lead.id — enables idempotent upsert on their side
  source?: string;
}

/** Contact as returned by OpenPhone. */
export interface OpenPhoneContact {
  id: string;
  externalId?: string | null;
  [key: string]: unknown; // tolerate the full defaultFields/customFields shape
}

/** Normalized result envelope for any OpenPhone call. */
export interface OpenPhoneResult<T = unknown> {
  success: boolean;
  statusCode?: number;
  data?: T;
  error?: string;
  durationMs: number;
}
