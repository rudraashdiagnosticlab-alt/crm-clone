'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Clock, NotebookPen, CheckCircle2, Download, Calendar } from 'lucide-react';
import { activitiesApi } from '@/lib/crm';
import { PageHead, Avatar } from '@/components/page-head';
import { StatusPill } from '@/components/status-pill';
import { FilterSelect, SearchInput } from '@/components/filter-controls';
import { downloadCsv } from '@/lib/export';

const RANGE_OPTS = [
  { label: 'All Time', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
];

function inRange(iso: string, range: string): boolean {
  if (!range) return true;
  const d = new Date(iso);
  const now = new Date();
  if (range === 'today') return d.toDateString() === now.toDateString();
  if (range === 'yesterday') {
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return d.toDateString() === y.toDateString();
  }
  if (range === '7d') return (now.getTime() - d.getTime()) / 86400000 <= 7;
  return true;
}

export default function ActivityPage() {
  const { data: allActivities = [] } = useQuery({ queryKey: ['activities'], queryFn: activitiesApi.list, retry: false });
  const [range, setRange] = useState('');
  const [q, setQ] = useState('');

  const term = q.trim().toLowerCase();
  const activities = allActivities.filter(
    (a) =>
      inRange(a.createdAt, range) &&
      (!term ||
        (a.lead?.businessName ?? '').toLowerCase().includes(term) ||
        (a.user?.name ?? '').toLowerCase().includes(term) ||
        a.action.toLowerCase().includes(term) ||
        (a.newValue ?? '').toLowerCase().includes(term)),
  );
  const calls = activities.filter((a) => a.action === 'call_completed');
  const positive = calls.filter((a) => a.newValue === 'closed_deal' || a.newValue === 'interested').length;

  const KPIS = [
    { icon: Phone, bg: '#e7eed8', color: '#42512f', val: calls.length, lab: 'Calls Logged' },
    { icon: Clock, bg: '#e3f1ee', color: '#2f6f63', val: '5h 10m', lab: 'Talk Time' },
    { icon: NotebookPen, bg: '#fbf3e2', color: '#c98a18', val: activities.length, lab: 'Activities' },
    { icon: CheckCircle2, bg: '#e8f2e4', color: '#3f7a32', val: positive, lab: 'Positive Outcomes' },
  ];

  return (
    <div>
      <PageHead lead="Every call logged with outcome and notes for the current shift.">
        <SearchInput value={q} onChange={setQ} placeholder="Search lead, user, outcome…" className="min-w-[220px]" />
        <FilterSelect icon={Calendar} value={range} onChange={setRange} options={RANGE_OPTS} />
        <button
          onClick={() => downloadCsv('activity-log', ['Time', 'Lead', 'By', 'Action', 'Outcome'], activities.map((a) => [new Date(a.createdAt).toLocaleString(), a.lead?.businessName ?? '', a.user?.name ?? '', a.action, a.newValue ?? '']))}
          disabled={activities.length === 0}
          className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted disabled:opacity-50"
        ><Download className="h-4 w-4" /> Export</button>
      </PageHead>

      <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        {KPIS.map((k) => (
          <div key={k.lab} className="rounded-2xl border bg-card p-[17px] shadow-sm">
            <div className="mb-3 grid h-[38px] w-[38px] place-items-center rounded-[10px]" style={{ background: k.bg, color: k.color }}><k.icon className="h-[19px] w-[19px]" /></div>
            <div className="font-display text-[28px] font-semibold leading-none">{k.val}</div>
            <div className="mt-1.5 text-[12.5px] text-muted-foreground">{k.lab}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-[18px] py-4"><h3 className="font-display text-[15px] font-semibold">Call Activity Log</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">
                <th className="px-4 py-[11px] font-semibold">Time</th>
                <th className="px-4 py-[11px] font-semibold">Lead</th>
                <th className="px-4 py-[11px] font-semibold">By</th>
                <th className="px-4 py-[11px] font-semibold">Action</th>
                <th className="px-4 py-[11px] font-semibold">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-[10px]"><Avatar name={a.lead?.businessName ?? '—'} /><span className="font-semibold">{a.lead?.businessName ?? '—'}</span></div></td>
                  <td className="px-4 py-3 text-muted-foreground">{a.user?.name ?? '—'}</td>
                  <td className="px-4 py-3"><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{a.action}</span></td>
                  <td className="px-4 py-3">{a.newValue ? <StatusPill status={a.newValue} /> : '—'}</td>
                </tr>
              ))}
              {activities.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{allActivities.length === 0 ? 'No activity yet — complete a call to log activity.' : 'No activity matches the current filters.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
