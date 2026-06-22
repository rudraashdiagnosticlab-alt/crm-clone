'use client';

import { useState, type ReactNode } from 'react';
import { SlidersHorizontal, GripVertical, X, RotateCcw } from 'lucide-react';
import { useColumnPrefs, type ColumnDef, type ColumnPrefs } from '@/lib/use-column-prefs';

export type { ColumnDef } from '@/lib/use-column-prefs';
export { useColumnPrefs } from '@/lib/use-column-prefs';

interface DataTableProps<T> {
  /** Stable key used to persist this table's column layout per user. */
  tableKey: string;
  columns: ColumnDef<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  title?: string;
  subtitle?: ReactNode;
  /** Filters / actions rendered to the left of the Customize Columns button. */
  toolbar?: ReactNode;
  loading?: boolean;
  emptyText?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: string;
}

export function DataTable<T>({
  tableKey,
  columns,
  rows,
  getRowKey,
  title,
  subtitle,
  toolbar,
  loading,
  emptyText = 'No records.',
  onRowClick,
  rowClassName = '',
}: DataTableProps<T>) {
  const prefs = useColumnPrefs(tableKey, columns);
  const [panelOpen, setPanelOpen] = useState(false);
  const cols = prefs.visible;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {(title || subtitle || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b px-[18px] py-4">
          <div>
            {title && <h3 className="font-display text-[15px] font-semibold">{title}</h3>}
            {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {toolbar}
            <ColumnsButton onClick={() => setPanelOpen(true)} customized={prefs.customized} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-[13px]">
          <thead>
            <tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">
              {cols.map((c) => (
                <th key={c.key} className={`px-4 py-[11px] font-semibold ${c.headerClassName ?? ''}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted-foreground">{emptyText}</td></tr>
            )}
            {!loading && rows.map((row, i) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`group border-b last:border-0 hover:bg-muted/50 ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName}`}
              >
                {cols.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.cellClassName ?? ''}`}>{c.render(row, i)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {!loading && rows.length > 0 && cols.some((c) => c.footer) && (
            <tfoot>
              <tr className="border-t bg-muted/30 font-semibold">
                {cols.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.cellClassName ?? ''}`}>{c.footer ? c.footer(rows) : null}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <CustomizePanel open={panelOpen} onClose={() => setPanelOpen(false)} prefs={prefs} />
    </div>
  );
}

/** Standalone "Columns" button (matches the app's filter-bar styling). */
export function ColumnsButton({ onClick, customized }: { onClick: () => void; customized?: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Customize columns"
      className="inline-flex items-center gap-[7px] rounded-md border bg-card px-3 py-2 text-[13px] font-medium hover:bg-muted"
    >
      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
      Columns
      {customized && <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Customized" />}
    </button>
  );
}

/**
 * Self-contained Customize Columns control (button + side panel) for tables
 * that render their own markup (e.g. dashboard widgets). Share the same `prefs`
 * object you use to render the table.
 */
export function CustomizeColumnsControl<T>({ prefs }: { prefs: ColumnPrefs<T> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ColumnsButton onClick={() => setOpen(true)} customized={prefs.customized} />
      <CustomizePanel open={open} onClose={() => setOpen(false)} prefs={prefs} />
    </>
  );
}

function CustomizePanel<T>({
  open,
  onClose,
  prefs,
}: {
  open: boolean;
  onClose: () => void;
  prefs: ReturnType<typeof useColumnPrefs<T>>;
}) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      {/* Side panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-[320px] max-w-[88vw] flex-col bg-card shadow-2xl transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-display text-[15px] font-semibold">Customize Columns</h3>
            <p className="text-xs text-muted-foreground">Toggle and drag to reorder</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {prefs.ordered.map((col) => {
            const hidden = prefs.isHidden(col.key);
            const isOver = overKey === col.key && dragKey !== col.key;
            return (
              <div
                key={col.key}
                draggable={!col.required}
                onDragStart={() => setDragKey(col.key)}
                onDragEnd={() => { setDragKey(null); setOverKey(null); }}
                onDragOver={(e) => { e.preventDefault(); setOverKey(col.key); }}
                onDrop={(e) => { e.preventDefault(); if (dragKey) prefs.reorder(dragKey, col.key); setDragKey(null); setOverKey(null); }}
                className={`mb-1.5 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors ${isOver ? 'border-primary bg-primary/5' : 'border-transparent bg-background'} ${dragKey === col.key ? 'opacity-50' : ''}`}
              >
                <GripVertical className={`h-4 w-4 shrink-0 ${col.required ? 'text-muted-foreground/30' : 'cursor-grab text-muted-foreground'}`} />
                <label className="flex flex-1 cursor-pointer items-center justify-between gap-2 text-[13px]">
                  <span className={hidden && !col.required ? 'text-muted-foreground' : 'font-medium'}>{col.header || '—'}</span>
                  <input
                    type="checkbox"
                    checked={col.required || !hidden}
                    disabled={col.required}
                    onChange={() => prefs.toggle(col.key)}
                    className="h-4 w-4 accent-[#42512f] disabled:opacity-40"
                  />
                </label>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-5 py-3.5">
          <button
            onClick={prefs.reset}
            disabled={!prefs.customized}
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-2 text-[13px] font-medium hover:bg-muted disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to default
          </button>
          <button onClick={onClose} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:opacity-90">Done</button>
        </div>
      </aside>
    </>
  );
}
