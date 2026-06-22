'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { tokenStore } from './api';
import { loadServerPreferences, saveServerPreference, removeServerPreference } from './preferences';

/** Server preference key for a table's column layout. */
const serverKeyFor = (tableKey: string) => `cols:${tableKey}`;

/** A single column definition for a customizable table. */
export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => ReactNode;
  /** Optional footer cell (e.g. a totals row), rendered when any column has one. */
  footer?: (rows: T[]) => ReactNode;
  /** Hidden by default until the user enables it. */
  defaultHidden?: boolean;
  /** Cannot be hidden or moved out (e.g. the primary identity column). */
  required?: boolean;
  /** Default column width in px (user can resize from there). */
  width?: number;
  headerClassName?: string;
  cellClassName?: string;
}

interface StoredPrefs {
  order: string[];
  hidden: string[];
  widths?: Record<string, number>;
}

/** Decode the current user's id from the JWT so prefs are per-user. */
function currentUserId(): string {
  const token = tokenStore.access;
  if (!token) return 'anon';
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    return payload.sub ?? payload.email ?? 'anon';
  } catch {
    return 'anon';
  }
}

const keyFor = (tableKey: string) => `crm.cols.${currentUserId()}.${tableKey}`;

function load(tableKey: string): StoredPrefs | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(keyFor(tableKey));
    return raw ? (JSON.parse(raw) as StoredPrefs) : null;
  } catch {
    return null;
  }
}

function saveLocal(tableKey: string, value: StoredPrefs) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(tableKey), JSON.stringify(value));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export interface ColumnPrefs<T> {
  /** Visible columns, in the user's order — drives the rendered table. */
  visible: ColumnDef<T>[];
  /** All columns in the user's order — drives the customize panel. */
  ordered: ColumnDef<T>[];
  isHidden: (key: string) => boolean;
  toggle: (key: string) => void;
  /** Move the column with `key` to the position of `beforeKey` (drag-and-drop). */
  reorder: (key: string, beforeKey: string) => void;
  /** User-set column widths (px), keyed by column key. */
  widths: Record<string, number>;
  /** Set/override a column's width (drag-to-resize). */
  setWidth: (key: string, px: number) => void;
  reset: () => void;
  /** True when the layout differs from the column defaults. */
  customized: boolean;
}

/**
 * Per-user, per-table column preferences (visibility + order), persisted to
 * localStorage and applied instantly. New columns added to the app appear
 * automatically; removed columns are dropped from saved prefs gracefully.
 */
export function useColumnPrefs<T>(tableKey: string, columns: ColumnDef<T>[]): ColumnPrefs<T> {
  const defaultOrder = useMemo(() => columns.map((c) => c.key), [columns]);
  const defaultHidden = useMemo(() => columns.filter((c) => c.defaultHidden).map((c) => c.key), [columns]);
  const byKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);

  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [hidden, setHidden] = useState<string[]>(defaultHidden);
  const [widths, setWidths] = useState<Record<string, number>>({});

  // Load saved prefs and merge with the current column set. localStorage is
  // applied instantly; the server copy (cross-device) is applied once it loads.
  useEffect(() => {
    let cancelled = false;
    const applyMerged = (saved: StoredPrefs | null) => {
      if (!saved) {
        setOrder(defaultOrder);
        setHidden(defaultHidden);
        setWidths({});
        return;
      }
      const known = new Set(defaultOrder);
      const mergedOrder = saved.order.filter((k) => known.has(k));
      for (const k of defaultOrder) if (!mergedOrder.includes(k)) mergedOrder.push(k); // append new columns
      const mergedHidden = saved.hidden.filter((k) => known.has(k));
      // New columns flagged defaultHidden stay hidden unless the user saw them before.
      for (const k of defaultHidden) if (!saved.order.includes(k)) mergedHidden.push(k);
      setOrder(mergedOrder);
      setHidden(mergedHidden);
      setWidths(saved.widths ?? {});
    };

    applyMerged(load(tableKey)); // instant local
    loadServerPreferences().then((all) => {
      if (cancelled) return;
      const sv = all[serverKeyFor(tableKey)] as StoredPrefs | undefined;
      if (sv && sv.order) {
        applyMerged(sv);
        saveLocal(tableKey, sv); // refresh local cache from authoritative server copy
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, defaultOrder, defaultHidden]);

  const persist = useCallback(
    (nextOrder: string[], nextHidden: string[], nextWidths: Record<string, number>) => {
      const value: StoredPrefs = { order: nextOrder, hidden: nextHidden, widths: nextWidths };
      saveLocal(tableKey, value); // instant
      saveServerPreference(serverKeyFor(tableKey), value); // cross-device (debounced)
    },
    [tableKey],
  );

  const toggle = useCallback(
    (key: string) => {
      if (byKey.get(key)?.required) return;
      setHidden((h) => {
        const next = h.includes(key) ? h.filter((k) => k !== key) : [...h, key];
        persist(order, next, widths);
        return next;
      });
    },
    [byKey, order, widths, persist],
  );

  const reorder = useCallback(
    (key: string, beforeKey: string) => {
      if (key === beforeKey) return;
      setOrder((o) => {
        const next = o.filter((k) => k !== key);
        const idx = next.indexOf(beforeKey);
        if (idx < 0) next.push(key);
        else next.splice(idx, 0, key);
        persist(next, hidden, widths);
        return next;
      });
    },
    [hidden, widths, persist],
  );

  const setWidth = useCallback(
    (key: string, px: number) => {
      const w = Math.max(60, Math.round(px));
      setWidths((prev) => {
        const next = { ...prev, [key]: w };
        persist(order, hidden, next);
        return next;
      });
    },
    [order, hidden, persist],
  );

  const reset = useCallback(() => {
    setOrder(defaultOrder);
    setHidden(defaultHidden);
    setWidths({});
    if (typeof window !== 'undefined') localStorage.removeItem(keyFor(tableKey));
    removeServerPreference(serverKeyFor(tableKey));
  }, [tableKey, defaultOrder, defaultHidden]);

  const ordered = useMemo(
    () => order.map((k) => byKey.get(k)).filter((c): c is ColumnDef<T> => !!c),
    [order, byKey],
  );
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const visible = useMemo(
    () => ordered.filter((c) => c.required || !hiddenSet.has(c.key)),
    [ordered, hiddenSet],
  );
  const customized = useMemo(
    () =>
      order.join() !== defaultOrder.join() ||
      hidden.slice().sort().join() !== defaultHidden.slice().sort().join() ||
      Object.keys(widths).length > 0,
    [order, hidden, widths, defaultOrder, defaultHidden],
  );

  return {
    visible,
    ordered,
    isHidden: useCallback((k: string) => hiddenSet.has(k), [hiddenSet]),
    toggle,
    reorder,
    widths,
    setWidth,
    reset,
    customized,
  };
}
