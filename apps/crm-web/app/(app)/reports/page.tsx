'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { metricsApi } from '@/lib/crm';

function Metrics({ total, planned, balance, progressPct }: { total: number; planned: number; balance: number; progressPct: number }) {
  return (
    <>
      <td className="px-4 py-2 text-right tabular-nums">{total.toLocaleString()}</td>
      <td className="px-4 py-2 text-right tabular-nums">{planned.toLocaleString()}</td>
      <td className="px-4 py-2 text-right tabular-nums">{balance.toLocaleString()}</td>
      <td className="px-4 py-2 text-right tabular-nums">
        <span className={progressPct >= 100 ? 'text-green-600' : progressPct < 10 ? 'text-red-600' : ''}>
          {progressPct}%
        </span>
      </td>
    </>
  );
}

export default function ReportsPage() {
  const { data: pivot = [], isLoading } = useQuery({ queryKey: ['pivot'], queryFn: metricsApi.pivot });
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Expandable Timezone › State › City pivot (PVT-001/002) — click a row to drill down.
      </p>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Territory</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
              <th className="px-4 py-2.5 text-right font-medium">Planned</th>
              <th className="px-4 py-2.5 text-right font-medium">Balance</th>
              <th className="px-4 py-2.5 text-right font-medium">Progress %</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td>
              </tr>
            )}
            {pivot.map((tz) => {
              const tzKey = tz.timezone;
              const tzOpen = open.has(tzKey);
              return (
                <RowGroup key={tzKey}>
                  <tr className="cursor-pointer border-b bg-muted/20 font-medium hover:bg-muted/40" onClick={() => toggle(tzKey)}>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1">
                        {tzOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {tz.timezone}
                      </span>
                    </td>
                    <Metrics {...tz} />
                  </tr>
                  {tzOpen &&
                    tz.states.map((st) => {
                      const stKey = `${tzKey}/${st.state}`;
                      const stOpen = open.has(stKey);
                      return (
                        <RowGroup key={stKey}>
                          <tr className="cursor-pointer border-b hover:bg-muted/30" onClick={() => toggle(stKey)}>
                            <td className="py-2 pl-10 pr-4">
                              <span className="inline-flex items-center gap-1">
                                {stOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                {st.state}
                              </span>
                            </td>
                            <Metrics {...st} />
                          </tr>
                          {stOpen &&
                            st.cities.map((ci) => (
                              <tr key={`${stKey}/${ci.city}`} className="border-b text-muted-foreground last:border-0">
                                <td className="py-2 pl-16 pr-4">{ci.city}</td>
                                <Metrics {...ci} />
                              </tr>
                            ))}
                        </RowGroup>
                      );
                    })}
                </RowGroup>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
