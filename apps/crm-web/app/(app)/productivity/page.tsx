'use client';

import { useQuery } from '@tanstack/react-query';
import { productivityApi, formatDuration } from '@/lib/crm';

export default function ProductivityPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['productivity'],
    queryFn: productivityApi.perCaller,
  });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Per-caller productivity (PRD-005) · calls, completed leads, conversion %, hours
      </p>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Caller</th>
              <th className="px-4 py-2.5 text-right font-medium">Calls Today</th>
              <th className="px-4 py-2.5 text-right font-medium">Assigned</th>
              <th className="px-4 py-2.5 text-right font-medium">Completed</th>
              <th className="px-4 py-2.5 text-right font-medium">Conversion %</th>
              <th className="px-4 py-2.5 text-right font-medium">Talk Time</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.callsToday}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.assigned}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.leadsCompleted}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.conversionPct}%</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatDuration(r.productiveSecs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
