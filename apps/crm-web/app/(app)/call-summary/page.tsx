'use client';

import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { productivityApi, type DailySummaryRow } from '@/lib/crm';

function toCsv(rows: DailySummaryRow[]): string {
  const header = 'Caller,Calls Made,Connected,Callbacks,Deals';
  const body = rows.map((r) => [r.name, r.callsMade, r.connected, r.callbacks, r.deals].join(','));
  return [header, ...body].join('\n');
}

export default function CallSummaryPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: productivityApi.dailySummary,
  });

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-call-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = rows.reduce(
    (a, r) => ({
      callsMade: a.callsMade + r.callsMade,
      connected: a.connected + r.connected,
      callbacks: a.callbacks + r.callbacks,
      deals: a.deals + r.deals,
    }),
    { callsMade: 0, connected: 0, callbacks: 0, deals: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          End-of-day report — calls, connected, callbacks, deals per caller (CAL-023)
        </p>
        <button
          onClick={exportCsv}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Caller</th>
              <th className="px-4 py-2.5 text-right font-medium">Calls Made</th>
              <th className="px-4 py-2.5 text-right font-medium">Connected</th>
              <th className="px-4 py-2.5 text-right font-medium">Callbacks</th>
              <th className="px-4 py-2.5 text-right font-medium">Deals</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.callsMade}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.connected}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.callbacks}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.deals}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/30 font-semibold">
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{totals.callsMade}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{totals.connected}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{totals.callbacks}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{totals.deals}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
