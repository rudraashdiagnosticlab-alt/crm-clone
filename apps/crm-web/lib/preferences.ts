'use client';

import { api } from './api';

/**
 * Server-synced user preferences (cross-device). A single GET loads every
 * preference once per session; reads are served from an in-memory cache, and
 * writes are debounced PUTs. localStorage (in use-column-prefs) remains the
 * instant cache/offline fallback so the UI never waits on the network.
 */
let cache: Record<string, unknown> | null = null;
let inflight: Promise<Record<string, unknown>> | null = null;

/** Load (once) all preferences for the current user. Never rejects. */
export function loadServerPreferences(): Promise<Record<string, unknown>> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = api
    .get('/me/preferences')
    .then((r) => {
      cache = (r.data ?? {}) as Record<string, unknown>;
      return cache;
    })
    .catch(() => {
      cache = {};
      return cache;
    });
  return inflight;
}

const timers: Record<string, ReturnType<typeof setTimeout>> = {};

/** Upsert a preference (debounced ~500ms). Updates the in-memory cache immediately. */
export function saveServerPreference(key: string, value: unknown) {
  if (cache) cache[key] = value;
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => {
    api.put('/me/preferences', { key, value }).catch(() => {
      /* offline / unauthorized — localStorage still holds the value */
    });
  }, 500);
}

/** Remove a preference (reset to default) on the server. */
export function removeServerPreference(key: string) {
  if (cache) delete cache[key];
  clearTimeout(timers[key]);
  api.delete(`/me/preferences/${encodeURIComponent(key)}`).catch(() => {});
}
