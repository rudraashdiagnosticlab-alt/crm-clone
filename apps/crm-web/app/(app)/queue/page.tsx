'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ListOrdered, CheckCircle2, Clock, Percent, Play, Phone, Filter, MapPin, Building2, Pin } from 'lucide-react';
import { callsApi, formatDuration } from '@/lib/crm';
import { type Lead } from '@/lib/leads';
import { PageHead } from '@/components/page-head';
import { StatusPill } from '@/components/status-pill';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { DateRangePicker, FilterSelect, SearchInput, optionsFrom } from '@/components/filter-controls';
import { DataTable, type ColumnDef } from '@/components/data-table';
import { inDateBounds, type DateRange } from '@/lib/date-filters';

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
  const [tz, setTz] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [created, setCreated] = useState<DateRange>({ from: '', to: '' });
  const [q, setQ] = useState('');
  const { data: dash } = useQuery({ queryKey: ['caller-dash'], queryFn: callsApi.dashboard });
  const { data: allLeads = [] } = useQuery({ queryKey: ['caller-leads'], queryFn: callsApi.myLeads });

  // Timezone → State → City: each level's options narrow to the picks above it.
  const tzOpts = optionsFrom(allLeads.map((l) => l.timezone), 'All Timezones');
  const stateOpts = optionsFrom(
    allLeads.filter((l) => !tz || l.timezone === tz).map((l) => l.state),
    'All States',
  );
  const cityOpts = optionsFrom(
    allLeads.filter((l) => (!tz || l.timezone === tz) && (!state || l.state === state)).map((l) => l.city),
    'All Cities',
  );

  const term = q.trim().toLowerCase();
  const leads = allLeads.filter(
    (l) =>
      (!status || l.status === status) &&
      (!tz || l.timezone === tz) &&
      (!state || l.state === state) &&
      (!city || l.city === city) &&
      inDateBounds(l.createdAt, created) &&
      (!term ||
        l.businessName.toLowerCase().includes(term) ||
        l.phone.toLowerCase().includes(term) ||
        l.city.toLowerCase().includes(term) ||
        l.state.toLowerCase().includes(term)),
  );
  // Pinned = callback date reached (today or earlier) and not yet completed (req 3).
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const isPinned = (l: Lead) => !!(l.callbackAt && !l.callbackCompletedAt && new Date(l.callbackAt) <= endOfToday);
  const pinned = allLeads
    .filter(isPinned)
    .sort((a, b) => new Date(a.callbackAt!).getTime() - new Date(b.callbackAt!).getTime());
  const pinnedCount = leads.filter(isPinned).length;

  const columns = useMemo<ColumnDef<Lead>[]>(() => [
    {
      key: 'num', header: '#', required: true,
      render: (l, i) => { const done = l.status === 'closed' || l.status === 'rejected'; return <div className="grid h-6 w-6 place-items-center rounded-[7px] bg-[#e7eed8] text-[11px] font-bold text-[#42512f]">{done ? '✓' : i + 1}</div>; },
    },
    { key: 'company', header: 'Company', cellClassName: 'font-semibold', render: (l) => l.businessName },
    { key: 'phone', header: 'Phone', cellClassName: 'font-mono text-[12px]', render: (l) => l.phone },
    { key: 'location', header: 'Location', render: (l) => `${l.city}, ${l.state} · ${l.timezone}` },
    {
      key: 'status',
      header: 'Status',
      render: (l) => (
        <div className="space-y-1">
          <StatusPill status={l.status} />
          {l.callbackAt && !l.callbackCompletedAt && (
            <div className="text-[11px] font-medium text-[#a8431f]">
              Callback {new Date(l.callbackAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      ),
    },
    { key: 'actions', header: '', required: true, render: (l) => <button onClick={() => router.push(`/calling?leadId=${l.id}`)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"><Phone className="h-3.5 w-3.5" /> Call</button> },
  ], [router]);

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

      {pinned.length > 0 && (
        <div className="mb-5 rounded-2xl border border-[#f1d9d2] bg-[#fdf6f4] shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#f1d9d2] px-[18px] py-3">
            <Pin className="h-4 w-4 text-[#a8431f]" />
            <h3 className="font-display text-[14px] font-semibold text-[#a8431f]">Pinned Callbacks</h3>
            <span className="text-xs text-[#a8431f]/70">{pinned.length} due — stays until the call is completed</span>
          </div>
          <div className="divide-y divide-[#f1d9d2]/60">
            {pinned.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-[18px] py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{l.businessName}</div>
                  <div className="truncate font-mono text-[11.5px] text-muted-foreground">{l.phone}</div>
                </div>
                <div className="text-[12px] font-medium text-[#a8431f]">
                  {new Date(l.callbackAt!).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <button
                  onClick={() => router.push(`/calling?leadId=${l.id}`)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable
        tableKey="queue"
        columns={columns}
        rows={leads}
        getRowKey={(l) => l.id}
        title="Call Queue"
        subtitle={`${leads.length} of ${allLeads.length} · ${pinnedCount} pinned callback(s)`}
        emptyText={allLeads.length === 0 ? 'No leads in queue.' : 'No leads match the current filters.'}
        toolbar={
          <>
            <SearchInput value={q} onChange={setQ} placeholder="Search company, phone, location…" className="min-w-[220px]" />
            <FilterSelect icon={Clock} value={tz} onChange={(v) => { setTz(v); setState(''); setCity(''); }} options={tzOpts} />
            <FilterSelect icon={MapPin} value={state} onChange={(v) => { setState(v); setCity(''); }} options={stateOpts} />
            <FilterSelect icon={Building2} value={city} onChange={setCity} options={cityOpts} />
            <FilterSelect icon={Filter} value={status} onChange={setStatus} options={STATUS_OPTS} />
            <DateRangePicker value={created} onChange={setCreated} />
          </>
        }
      />
    </div>
  );
}
