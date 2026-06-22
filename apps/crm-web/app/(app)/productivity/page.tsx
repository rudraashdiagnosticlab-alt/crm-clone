'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Clock, Percent, Star } from 'lucide-react';
import { productivityApi, formatDuration, type Period } from '@/lib/crm';
import { PageHead, Avatar } from '@/components/page-head';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Segmented } from '@/components/segmented';

const PERIODS = [
  { label: 'Day', value: 'day' as Period },
  { label: 'Week', value: 'week' as Period },
  { label: 'Month', value: 'month' as Period },
];
const PERIOD_LABEL: Record<Period, string> = { day: 'today', week: 'this week', month: 'this month' };

export default function ProductivityPage() {
  const [period, setPeriod] = useState<Period>('week');
  const { data: rows = [], isFetching } = useQuery({ queryKey: ['productivity', period], queryFn: () => productivityApi.perCaller(period) });

  const totalCalls = rows.reduce((a, r) => a + r.callsToday, 0);
  const totalTalk = rows.reduce((a, r) => a + r.productiveSecs, 0);
  const best = [...rows].sort((a, b) => b.callsToday - a.callsToday)[0];
  const maxConv = Math.max(1, ...rows.map((r) => r.conversionPct));

  return (
    <div>
      <PageHead lead="Productivity and conversion across the calling floor.">
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
      </PageHead>

      <div className={`mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))] transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
        <KpiCard icon={Phone} iconBg="#e7eed8" iconColor="#42512f" value={totalCalls} label={`Total Calls (${PERIOD_LABEL[period]})`} />
        <KpiCard icon={Clock} iconBg="#e3f1ee" iconColor="#2f6f63" value={formatDuration(totalTalk)} label="Total Talk Time" />
        <KpiCard icon={Percent} iconBg="#fbf3e2" iconColor="#c98a18" value={totalCalls ? formatDuration(Math.round(totalTalk / totalCalls)) : '0s'} label="Avg Call Time" />
        <KpiCard icon={Star} iconBg="#e8f2e4" iconColor="#3f7a32" value={best?.name?.split(' ')[0] ?? '—'} label="Best Performer" />
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-[18px] py-4"><h3 className="font-display text-[15px] font-semibold">Caller Productivity</h3><div className="text-xs text-muted-foreground">Talk time, conversion, output</div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">
                <th className="px-4 py-[11px] font-semibold">Caller</th>
                <th className="px-4 py-[11px] text-right font-semibold">Assigned</th>
                <th className="px-4 py-[11px] text-right font-semibold">Completed</th>
                <th className="px-4 py-[11px] text-right font-semibold">Talk Time</th>
                <th className="px-4 py-[11px] text-right font-semibold">Conversion</th>
                <th className="px-4 py-[11px] font-semibold">Output</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3"><div className="flex items-center gap-[10px]"><Avatar name={r.name} /><div className="font-semibold">{r.name}</div></div></td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.assigned}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{r.leadsCompleted}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatDuration(r.productiveSecs)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-primary">{r.conversionPct}%</td>
                  <td className="px-4 py-3" style={{ minWidth: 160 }}>
                    <div className="flex items-center gap-[9px]">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e7eed8]">
                        <span className="block h-full rounded-full" style={{ width: `${(r.conversionPct / maxConv) * 100}%`, background: 'linear-gradient(90deg,#556b34,#6f8745)' }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
