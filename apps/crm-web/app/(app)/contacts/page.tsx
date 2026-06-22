'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Plus, Phone, Mail, MapPin, Eye, Filter, Clock } from 'lucide-react';
import { leadsApi } from '@/lib/leads';
import { PageHead, Avatar } from '@/components/page-head';
import { StatusPill } from '@/components/status-pill';
import { FilterSelect, SearchInput, optionsFrom } from '@/components/filter-controls';

const STATUS_OPTS = [
  { label: 'All Statuses', value: '' },
  ...(['new', 'in_progress', 'contacted', 'interested', 'closed', 'rejected'] as const).map((s) => ({
    label: s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: s,
  })),
];

export default function ContactsPage() {
  const router = useRouter();
  const { data: allLeads = [] } = useQuery({ queryKey: ['leads'], queryFn: leadsApi.list });
  const [status, setStatus] = useState('');
  const [tz, setTz] = useState('');
  const [q, setQ] = useState('');

  const tzOpts = optionsFrom(allLeads.map((l) => l.timezone), 'All Timezones');
  const term = q.trim().toLowerCase();
  const leads = allLeads.filter(
    (l) =>
      (!status || l.status === status) &&
      (!tz || l.timezone === tz) &&
      (!term ||
        l.businessName.toLowerCase().includes(term) ||
        l.phone.toLowerCase().includes(term) ||
        (l.email ?? '').toLowerCase().includes(term) ||
        l.city.toLowerCase().includes(term) ||
        l.state.toLowerCase().includes(term)),
  );

  return (
    <div>
      <PageHead lead="People and companies across your book of business.">
        <button className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted"><RefreshCw className="h-4 w-4" /> Sync contacts</button>
        <button onClick={() => router.push('/leads')} className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" /> New contact</button>
      </PageHead>

      <div className="mb-[18px] flex flex-wrap items-center gap-2.5">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, phone, email, location…" className="min-w-[260px] flex-1" />
        <FilterSelect icon={Clock} value={tz} onChange={setTz} options={tzOpts} />
        <FilterSelect icon={Filter} value={status} onChange={setStatus} options={STATUS_OPTS} />
      </div>

      <div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-3">
        {leads.slice(0, 18).map((l) => (
          <div key={l.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <Avatar name={l.businessName} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{l.businessName}</div>
                <div className="truncate text-[12.5px] text-muted-foreground">{l.leadId}</div>
              </div>
              <StatusPill status={l.status} />
            </div>
            <div className="flex flex-col gap-[7px] text-[13px]">
              <div className="flex items-center gap-[9px] text-muted-foreground"><Phone className="h-4 w-4" /><span className="font-mono text-foreground">{l.phone}</span></div>
              <div className="flex items-center gap-[9px] text-muted-foreground"><Mail className="h-4 w-4" /><span className="truncate text-[12px] text-foreground">{l.email ?? '—'}</span></div>
              <div className="flex items-center gap-[9px] text-muted-foreground"><MapPin className="h-4 w-4" /><span className="text-foreground">{l.city}, {l.state} · {l.timezone}</span></div>
            </div>
            <div className="mt-[14px] flex gap-2">
              <button onClick={() => router.push('/calling')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground"><Phone className="h-3.5 w-3.5" /> Call</button>
              <button onClick={() => router.push(`/leads/${l.id}`)} className="grid place-items-center rounded-md border px-3 py-2"><Eye className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        {leads.length === 0 && <p className="text-sm text-muted-foreground">{allLeads.length === 0 ? 'No contacts yet.' : 'No contacts match the current filters.'}</p>}
      </div>
    </div>
  );
}
