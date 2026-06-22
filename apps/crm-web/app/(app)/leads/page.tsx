'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Plus, Phone, Eye, Clock, MapPin, Building2, Filter, Target, Zap, Layers, Percent } from 'lucide-react';
import { leadsApi, type CreateLeadInput, type Lead } from '@/lib/leads';
import { metricsApi } from '@/lib/crm';
import { api } from '@/lib/api';
import { QuoStatusBadge } from '@/components/quo-status-badge';
import { StatusPill } from '@/components/status-pill';
import { PageHead, Avatar } from '@/components/page-head';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { FilterSelect, SearchInput, optionsFrom } from '@/components/filter-controls';
import { DataTable, type ColumnDef } from '@/components/data-table';
import { downloadCsv } from '@/lib/export';

const EMPTY: CreateLeadInput = { businessName: '', phone: '', email: '', state: '', city: '', timezone: 'EST' };

const STATUS_OPTS = [
  { label: 'All Statuses', value: '' },
  ...(['new', 'in_progress', 'contacted', 'interested', 'closed', 'rejected'] as const).map((s) => ({
    label: s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: s,
  })),
];

export default function LeadsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateLeadInput>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [tz, setTz] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const { data: allLeads = [], isLoading } = useQuery({ queryKey: ['leads'], queryFn: leadsApi.list });
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get('/auth/me')).data, retry: false });
  const canManage = me?.role === 'admin' || me?.role === 'team_leader';

  // States cascade from the selected timezone; cities from timezone + state.
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
      (!tz || l.timezone === tz) &&
      (!state || l.state === state) &&
      (!city || l.city === city) &&
      (!status || l.status === status) &&
      (!term ||
        l.businessName.toLowerCase().includes(term) ||
        l.leadId.toLowerCase().includes(term) ||
        l.phone.toLowerCase().includes(term) ||
        (l.email ?? '').toLowerCase().includes(term)),
  );
  const { data: s } = useQuery({ queryKey: ['metrics', 'summary'], queryFn: () => metricsApi.summary(), retry: false });

  const create = useMutation({
    // Drop empty optional strings so they persist as null rather than "".
    mutationFn: () => {
      const cleaned = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? undefined : v]),
      ) as CreateLeadInput;
      return leadsApi.create({ ...cleaned, businessName: form.businessName, phone: form.phone, state: form.state, city: form.city });
    },
    onSuccess: (lead) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      router.push(`/leads/${lead.id}`);
    },
  });

  const columns = useMemo<ColumnDef<Lead>[]>(() => [
    {
      key: 'lead', header: 'Lead', required: true,
      render: (l) => (
        <div className="flex items-center gap-[10px]">
          <Avatar name={l.businessName} />
          <div>
            <div className="font-semibold text-foreground">{l.businessName}</div>
            <div className="font-mono text-[11.5px] text-muted-foreground">{l.leadId}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cellClassName: 'font-mono text-[12px] text-muted-foreground', render: (l) => l.phone },
    { key: 'name', header: 'Name', render: (l) => l.contactName ?? '—' },
    { key: 'tz', header: 'TZ', render: (l) => <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{l.timezone}</span> },
    { key: 'email', header: 'Email', cellClassName: 'text-muted-foreground', render: (l) => l.email ?? '—' },
    { key: 'industry', header: 'Industry', cellClassName: 'text-muted-foreground', render: (l) => l.industry ?? '—' },
    { key: 'title', header: 'Title', cellClassName: 'text-muted-foreground', render: (l) => l.title ?? '—' },
    { key: 'location', header: 'Location', render: (l) => `${l.city}, ${l.state}` },
    { key: 'vlc', header: 'VLC', cellClassName: 'text-muted-foreground', render: (l) => l.vlc ?? '—' },
    { key: 'empCode', header: 'Emp Code', cellClassName: 'font-mono text-[12px] text-muted-foreground', render: (l) => l.employeeCode ?? '—' },
    { key: 'caller', header: 'Caller', render: (l) => l.assignedTo?.name ?? '—' },
    { key: 'status', header: 'Status', render: (l) => <StatusPill status={l.status} /> },
    { key: 'comments', header: 'Comments', cellClassName: 'max-w-[220px] truncate text-muted-foreground', render: (l) => <span title={l.comments ?? ''}>{l.comments ?? '—'}</span> },
    { key: 'followup', header: 'Follow-up', cellClassName: 'text-muted-foreground', render: (l) => l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toLocaleDateString() : '—' },
    { key: 'category', header: 'Category', render: (l) => l.leadCategory ?? '—' },
    { key: 'quo', header: 'Quo', render: (l) => <QuoStatusBadge status={l.quoStatus} /> },
    {
      key: 'actions', header: '', required: true,
      render: (l) => (
        <div className="flex gap-1.5 opacity-50 transition-opacity group-hover:opacity-100">
          <button onClick={() => router.push('/calling')} title="Call" className="grid h-[30px] w-[30px] place-items-center rounded-lg border text-[#333f25] hover:bg-primary hover:text-primary-foreground dark:text-foreground"><Phone className="h-[15px] w-[15px]" /></button>
          <button onClick={() => router.push(`/leads/${l.id}`)} title="View" className="grid h-[30px] w-[30px] place-items-center rounded-lg border text-[#333f25] hover:bg-primary hover:text-primary-foreground dark:text-foreground"><Eye className="h-[15px] w-[15px]" /></button>
        </div>
      ),
    },
  ], [router]);

  return (
    <div>
      <PageHead lead="Master database of all leads across territories and timezones.">
        {canManage && (
          <button onClick={() => router.push('/import')} className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted">
            <Upload className="h-4 w-4" /> Import CSV
          </button>
        )}
        <button
          onClick={() => downloadCsv(
            'leads',
            ['PHONE', 'COMPANY NAME', 'NAME', 'TIME ZONE', 'EMAIL', 'INDUSTRY', 'TITLE', 'STATE', 'CITY', 'VLC', 'Employee Code', 'CALLER', 'STATUS', 'COMMENTS', 'NEXT FOLLOW UP DATE', 'LEAD CATEGORY'],
            leads.map((l) => [l.phone, l.businessName, l.contactName ?? '', l.timezone, l.email ?? '', l.industry ?? '', l.title ?? '', l.state, l.city, l.vlc ?? '', l.employeeCode ?? '', l.assignedTo?.name ?? '', l.status, l.comments ?? '', l.nextFollowUpDate ? new Date(l.nextFollowUpDate).toLocaleDateString() : '', l.leadCategory ?? '']),
          )}
          disabled={leads.length === 0}
          className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export
        </button>
        {canManage && (
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground shadow-sm hover:opacity-90">
            <Plus className="h-4 w-4" /> {showForm ? 'Close' : 'Add Lead'}
          </button>
        )}
      </PageHead>

      {/* KPIs */}
      <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <KpiCard icon={Target} iconBg="#e7f0f8" iconColor="#2c5d8f" value={(s?.totalLeads ?? 0).toLocaleString()} label="Total Leads" />
        <KpiCard icon={Zap} iconBg="#e7eed8" iconColor="#42512f" value={(s?.plannedLeads ?? 0).toLocaleString()} label="Planned Leads" />
        <KpiCard icon={Layers} iconBg="#fbf3e2" iconColor="#c98a18" value={(s?.balanceLeads ?? 0).toLocaleString()} label="Balance Leads" />
        <KpiCard icon={Percent} iconBg="#e8f2e4" iconColor="#3f7a32" value={`${s?.progressPct ?? 0}%`} label="Progress to Target" />
      </div>

      {/* Filter bar */}
      <div className="mb-[18px] flex flex-wrap items-center gap-2.5">
        <SearchInput value={q} onChange={setQ} placeholder="Search business, ID, phone, email…" className="min-w-[260px] flex-1" />
        <FilterSelect icon={Clock} value={tz} onChange={(v) => { setTz(v); setState(''); setCity(''); }} options={[{ label: 'All Timezones', value: '' }, ...['EST', 'CST', 'MST', 'PST'].map((t) => ({ label: t, value: t }))]} />
        <FilterSelect icon={MapPin} value={state} onChange={(v) => { setState(v); setCity(''); }} options={stateOpts} />
        <FilterSelect icon={Building2} value={city} onChange={setCity} options={cityOpts} />
        <FilterSelect icon={Filter} value={status} onChange={setStatus} options={STATUS_OPTS} />
      </div>

      {/* Create form */}
      {showForm && canManage && (
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="mb-[18px] grid grid-cols-1 gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          {([
            ['businessName', 'Company Name *'], ['phone', 'Phone *'], ['contactName', 'Name'],
            ['email', 'Email'], ['industry', 'Industry'], ['title', 'Title'],
            ['state', 'State *'], ['city', 'City *'], ['vlc', 'VLC'],
            ['employeeCode', 'Employee Code'], ['caller', 'Caller (name/email)'], ['leadCategory', 'Lead Category'],
          ] as const).map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm">
              <span className="font-medium">{label}</span>
              <input value={(form as any)[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={label.includes('*')} className="w-full rounded-md border bg-background px-3 py-2" />
            </label>
          ))}
          <label className="space-y-1 text-sm">
            <span className="font-medium">Timezone</span>
            <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2">
              {['EST', 'CST', 'MST', 'PST'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Next Follow-up Date</span>
            <input type="date" value={form.nextFollowUpDate ?? ''} onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <label className="col-span-full space-y-1 text-sm">
            <span className="font-medium">Comments</span>
            <textarea value={form.comments ?? ''} onChange={(e) => setForm({ ...form, comments: e.target.value })} rows={2} className="w-full rounded-md border bg-background px-3 py-2" />
          </label>
          <div className="col-span-full flex items-center gap-3">
            <button type="submit" disabled={create.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {create.isPending ? 'Creating…' : 'Create & open'}
            </button>
            {create.isError && <span className="text-sm text-[#9e2b21]">Failed to create lead</span>}
          </div>
        </form>
      )}

      {/* Table */}
      <DataTable
        tableKey="leads"
        columns={columns}
        rows={leads}
        getRowKey={(l) => l.id}
        title="All Leads"
        subtitle={`${leads.length} shown`}
        loading={isLoading}
        emptyText={allLeads.length === 0 ? 'No leads yet — add one above.' : 'No leads match the current filters.'}
      />
    </div>
  );
}
