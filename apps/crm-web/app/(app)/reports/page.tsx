'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Download } from 'lucide-react';
import { metricsApi, type PivotTimezone } from '@/lib/crm';
import { PageHead } from '@/components/page-head';
import { downloadCsv, printTable } from '@/lib/export';

const EXPORT_HEADERS = ['Territory', 'Total', 'Planned', 'Balance', 'Progress %'];
function flattenPivot(pivot: PivotTimezone[]): (string | number)[][] {
  const rows: (string | number)[][] = [];
  for (const tz of pivot) {
    rows.push([tz.timezone, tz.total, tz.planned, tz.balance, `${tz.progressPct}%`]);
    for (const st of tz.states) {
      rows.push([`  ${st.state}`, st.total, st.planned, st.balance, `${st.progressPct}%`]);
      for (const ci of st.cities) rows.push([`    ${ci.city}`, ci.total, ci.planned, ci.balance, `${ci.progressPct}%`]);
    }
  }
  return rows;
}

function Cols({ total, planned, balance, progressPct }: { total: number; planned: number; balance: number; progressPct: number }) {
  return (
    <>
      <span className="w-[110px] text-right tabular-nums">{total.toLocaleString()}</span>
      <span className="w-[110px] text-right tabular-nums">{planned.toLocaleString()}</span>
      <span className="w-[110px] text-right tabular-nums">{balance.toLocaleString()}</span>
      <span className={`w-[90px] text-right tabular-nums ${progressPct >= 100 ? 'text-[#3f7a32]' : progressPct < 10 ? 'text-[#9e2b21]' : ''}`}>{progressPct}%</span>
    </>
  );
}

export default function ReportsPage() {
  const { data: pivot = [], isLoading } = useQuery({ queryKey: ['pivot'], queryFn: metricsApi.pivot });
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div>
      <PageHead lead="Expandable Timezone › State › City pivot — click a row to drill down.">
        <button onClick={() => downloadCsv('pivot-report', EXPORT_HEADERS, flattenPivot(pivot))} disabled={pivot.length === 0} className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted disabled:opacity-50"><Download className="h-4 w-4" /> Export Excel</button>
        <button onClick={() => printTable('Pivot Report', EXPORT_HEADERS, flattenPivot(pivot))} disabled={pivot.length === 0} className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted disabled:opacity-50"><Download className="h-4 w-4" /> Export PDF</button>
      </PageHead>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center border-b bg-background px-[14px] py-[11px] text-[11px] font-semibold uppercase tracking-[.06em] text-muted-foreground">
          <span className="flex-1">Territory</span>
          <span className="w-[110px] text-right">Total</span>
          <span className="w-[110px] text-right">Planned</span>
          <span className="w-[110px] text-right">Balance</span>
          <span className="w-[90px] text-right">Progress</span>
        </div>

        {isLoading && <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>}

        {pivot.map((tz) => {
          const tzOpen = open.has(tz.timezone);
          return (
            <div key={tz.timezone}>
              <div className="flex cursor-pointer items-center border-b bg-background/60 px-[14px] py-2.5 text-[13px] font-bold hover:bg-muted/60" onClick={() => toggle(tz.timezone)}>
                <span className="flex flex-1 items-center gap-2">
                  {tzOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  {tz.timezone}
                </span>
                <Cols {...tz} />
              </div>
              {tzOpen && tz.states.map((st) => {
                const stKey = `${tz.timezone}/${st.state}`;
                const stOpen = open.has(stKey);
                return (
                  <div key={stKey}>
                    <div className="flex cursor-pointer items-center border-b py-2 pl-9 pr-[14px] text-[13px] font-semibold hover:bg-muted/60" onClick={() => toggle(stKey)}>
                      <span className="flex flex-1 items-center gap-2">
                        {stOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        {st.state}
                      </span>
                      <Cols {...st} />
                    </div>
                    {stOpen && st.cities.map((ci) => (
                      <div key={`${stKey}/${ci.city}`} className="flex items-center border-b py-2 pl-[62px] pr-[14px] text-[13px] text-muted-foreground last:border-0">
                        <span className="flex-1">{ci.city}</span>
                        <Cols {...ci} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
