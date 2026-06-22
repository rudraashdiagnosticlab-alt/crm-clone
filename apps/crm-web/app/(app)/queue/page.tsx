'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ListOrdered, CheckCircle2, Clock, Percent, Play, Phone, Filter } from 'lucide-react';
import { callsApi, formatDuration } from '@/lib/crm';
import { PageHead } from '@/components/page-head';
import { StatusPill } from '@/components/status-pill';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { FilterSelect, SearchInput } from '@/components/filter-controls';

const STATUS_OPTS = [
  { label: 'All Statuses', value: '' },
  ...(['new', 'in_progress', 'contacted', 'interested', 'closed', 'rejected'] as const).map((s) => ({
    label: s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: s,
  })),
];

export default function QueuePage() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data: dash } = useQuery({ queryKey: ['caller-dash'], queryFn: callsApi.dashboard });
  const { data: allLeads = [] } = useQuery({ queryKey: ['caller-leads'], queryFn: callsApi.myLeads });

  const term = q.trim().toLowerCase();
  const leads = allLeads.filter(
    (l) =>
      (!status || l.status === status) &&
      (!term ||
        l.businessName.toLowerCase().includes(term) ||
        l.phone.toLowerCase().includes(term) ||
        l.city.toLowerCase().includes(term) ||
        l.state.toLowerCase().includes(term)),
  );

  return (
    <div>
      <PageHead lead="Your daily call queue. Auto-next opens the following lead when a call ends.">
        <button onClick={() => router.push('/calling')} className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground hover:opacity-90"><Play className="h-4 w-4" /> Resume calling</button>
      </PageHead>

      <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <KpiCard icon={ListOrdered} iconBg="#e7eed8" iconColor="#42512f" value={dash?.assignedLeads ?? 0} label="Assigned Leads" />
        <KpiCard icon={CheckCircle2} iconBg="#e8f2e4" iconColor="#3f7a32" value={dash?.callsCompleted ?? 0} label="Calls Completed" />
        <KpiCard icon={Clock} iconBg="#fbf3e2" iconColor="#c98a18" value={dash?.pendingLeads ?? 0} label="Pending Leads" />
        <KpiCard icon={Percent} iconBg="#e3f1ee" iconColor="#2f6f63" value={formatDuration(dash?.avgCallSecs ?? 0)} label="Avg Call Time" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b px-[18px] py-4">
          <div><h3 className="font-display text-[15px] font-semibold">Call Queue</h3><div className="text-xs text-muted-foreground">{leads.length} of {allLeads.length} · today&apos;s assignments</div></div>
          <div className="flex flex-wrap items-center gap-2.5">
            <SearchInput value={q} onChange={setQ} placeholder="Search company, phone, location…" className="min-w-[220px]" />
            <FilterSelect icon={Filter} value={status} onChange={setStatus} options={STATUS_OPTS} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">
                <th className="px-4 py-[11px] font-semibold">#</th>
                <th className="px-4 py-[11px] font-semibold">Company</th>
                <th className="px-4 py-[11px] font-semibold">Phone</th>
                <th className="px-4 py-[11px] font-semibold">Location</th>
                <th className="px-4 py-[11px] font-semibold">Status</th>
                <th className="px-4 py-[11px] font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((q, i) => {
                const done = q.status === 'closed' || q.status === 'rejected';
                return (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3"><div className="grid h-6 w-6 place-items-center rounded-[7px] bg-[#e7eed8] text-[11px] font-bold text-[#42512f]">{done ? '✓' : i + 1}</div></td>
                    <td className="px-4 py-3 font-semibold">{q.businessName}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{q.phone}</td>
                    <td className="px-4 py-3">{q.city}, {q.state} · {q.timezone}</td>
                    <td className="px-4 py-3"><StatusPill status={q.status} /></td>
                    <td className="px-4 py-3"><button onClick={() => router.push('/calling')} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"><Phone className="h-3.5 w-3.5" /> Call</button></td>
                  </tr>
                );
              })}
              {leads.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{allLeads.length === 0 ? 'No leads in queue.' : 'No leads match the current filters.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
