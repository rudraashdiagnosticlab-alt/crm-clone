'use client';

import { ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  /** Optional custom cell renderer; defaults to String(row[key]). */
  cell?: (row: T) => React.ReactNode;
  /** Extra classes for alignment, e.g. 'text-right'. */
  className?: string;
}

interface WidgetCardProps<T> {
  title: string;
  columns: Column<T>[];
  rows: T[];
  /** Footer total; defaults to rows.length. */
  total?: number;
  /** Empty-state message. */
  emptyMessage?: string;
}

export function WidgetCard<T>({
  title,
  columns,
  rows,
  total,
  emptyMessage = 'No records found.',
}: WidgetCardProps<T>) {
  const count = total ?? rows.length;
  const shown = Math.min(rows.length, 10);

  return (
    <section className="flex flex-col rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button className="text-muted-foreground hover:text-foreground" aria-label="More">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Sort control */}
      <div className="px-4 pb-2 pt-2">
        <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowUpDown className="h-3.5 w-3.5" /> Sort
        </button>
      </div>

      {/* Table */}
      <div className="min-h-[220px] flex-1 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y bg-muted/40 text-left text-xs font-medium text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} className={`whitespace-nowrap px-4 py-2 font-medium ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-4 py-2.5 ${col.className ?? ''}`}
                    >
                      {col.cell
                        ? col.cell(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <span>
          Total Records <span className="font-semibold text-foreground">{count}</span>
        </span>
        <div className="flex items-center gap-3">
          <span>
            {count === 0 ? '0' : `1 to ${shown}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="rounded p-0.5 hover:bg-muted disabled:opacity-40"
              disabled
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="rounded p-0.5 hover:bg-muted disabled:opacity-40"
              disabled={count <= 10}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
