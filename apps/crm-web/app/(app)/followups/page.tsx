'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Plus, Clock, RefreshCw, CheckCircle2, AlertTriangle, Phone, Filter } from 'lucide-react';
import { callsApi, type Followup } from '@/lib/crm';
import { PageHead, Avatar } from '@/components/page-head';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { FilterSelect, SearchInput } from '@/components/filter-controls';

const TIMEFRAME_OPTS = [
  { label: 'All Follow-Ups', value: '' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Due Today', value: 'today' },
  { label: 'This Week', value: 'week' },
];

function whenLabel(iso: string): { text: string; overdue: boolean; today: boolean } {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const overdue = d < now && !sameDay;
  const text = sameDay
    ? `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return { text, overdue, today: sameDay };
}

export default function FollowupsPage() {
  const router = useRouter();
  const { data: allFus = [], isLoading } = useQuery({ queryKey: ['followups'], queryFn: callsApi.followups, retry: false });
  const [timeframe, setTimeframe] = useState('');
  const [q, setQ] = useState('');

  const now = new Date();
  const dueToday = allFus.filter((f) => new Date(f.nextFollowupDate).toDateString() === now.toDateString()).length;
  const overdue = allFus.filter((f) => { const d = new Date(f.nextFollowupDate); return d < now && d.toDateString() !== now.toDateString(); }).length;
  const thisWeek = allFus.filter((f) => { const d = new Date(f.nextFollowupDate); const diff = (d.getTime() - now.getTime()) / 86400000; return diff >= 0 && diff <= 7; }).length;

  const matchesTimeframe = (f: Followup) => {
    const d = new Date(f.nextFollowupDate);
    const sameDay = d.toDateString() === now.toDateString();
    if (timeframe === 'overdue') return d < now && !sameDay;
    if (timeframe === 'today') return sameDay;
    if (timeframe === 'week') { const diff = (d.getTime() - now.getTime()) / 86400000; return diff >= 0 && diff <= 7; }
    return true;
  };
  const term = q.trim().toLowerCase();
  const fus = allFus.filter(
    (f) =>
      matchesTimeframe(f) &&
      (!term ||
        (f.lead?.businessName ?? '').toLowerCase().includes(term) ||
        (f.lead?.phone ?? '').toLowerCase().includes(term) ||
        (f.noteText ?? '').toLowerCase().includes(term)),
  );

  return (
    <div>
      <PageHead lead="Scheduled callbacks and follow-up reminders from call notes, sorted by due time.">
        <button onClick={() => router.push('/calendar')} className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted"><Calendar className="h-4 w-4" /> Calendar</button>
        <button onClick={() => router.push('/calling')} className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" /> Schedule</button>
      </PageHead>

      <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <KpiCard icon={Clock} iconBg="#fbeeec" iconColor="#a8431f" value={dueToday} label="Due Today" />
        <KpiCard icon={RefreshCw} iconBg="#fbf3e2" iconColor="#c98a18" value={thisWeek} label="This Week" />
        <KpiCard icon={CheckCircle2} iconBg="#e8f2e4" iconColor="#3f7a32" value={fus.length} label="Total Scheduled" />
        <KpiCard icon={AlertTriangle} iconBg="#fbeeec" iconColor="#a8431f" value={overdue} label="Overdue" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b px-[18px] py-4">
          <div><h3 className="font-display text-[15px] font-semibold">Upcoming Follow-Ups</h3><div className="text-xs text-muted-foreground">{fus.length} shown</div></div>
          <div className="flex flex-wrap items-center gap-2.5">
            <SearchInput value={q} onChange={setQ} placeholder="Search company, phone, note…" className="min-w-[220px]" />
            <FilterSelect icon={Filter} value={timeframe} onChange={setTimeframe} options={TIMEFRAME_OPTS} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">
                <th className="px-4 py-[11px] font-semibold">When</th>
                <th className="px-4 py-[11px] font-semibold">Company</th>
                <th className="px-4 py-[11px] font-semibold">Note</th>
                <th className="px-4 py-[11px] font-semibold">Phone</th>
                <th className="px-4 py-[11px] font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && fus.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{allFus.length === 0 ? 'No follow-ups scheduled. Set a follow-up date when saving a call note.' : 'No follow-ups match the current filters.'}</td></tr>}
              {fus.map((f: Followup) => {
                const w = whenLabel(f.nextFollowupDate);
                return (
                  <tr key={f.id} className="group border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: w.overdue ? '#a8431f' : w.today ? '#c98a18' : '#94ab68' }} /><b>{w.text}</b></div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-[10px]"><Avatar name={f.lead?.businessName ?? '—'} /><span className="font-semibold">{f.lead?.businessName ?? '—'}</span></div></td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-muted-foreground">{f.noteText}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{f.lead?.phone ?? '—'}</td>
                    <td className="px-4 py-3"><button onClick={() => router.push('/calling')} className="grid h-[30px] w-[30px] place-items-center rounded-lg border opacity-50 transition-opacity hover:bg-primary hover:text-primary-foreground group-hover:opacity-100"><Phone className="h-[15px] w-[15px]" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
