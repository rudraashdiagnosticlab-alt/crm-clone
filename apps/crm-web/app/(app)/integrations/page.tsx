'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Mic, Users, CheckCircle2, KeyRound, RefreshCw, Play, Download } from 'lucide-react';
import { configApi, openphoneApi } from '@/lib/crm';
import { PageHead, Avatar } from '@/components/page-head';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { DataTable, type ColumnDef } from '@/components/data-table';

type SyncRow = (typeof SYNC)[number];

const BASE_INTEGRATIONS = [
  { nm: 'OpenPhone', logo: 'OP', bg: '#5b5bd6', ds: 'Cloud calling, SMS & call recording. Primary dialer for the sales team.', connected: false, meta: 'Not connected' },
  { nm: 'Quo', logo: 'QU', bg: '#42512f', ds: 'Lead sync — pushes qualified leads to Quo and tracks sync status.', connected: false, meta: 'Not connected' },
  { nm: 'Twilio', logo: 'TW', bg: '#f22f46', ds: 'Programmable voice API for auto-dialer and call queue routing.', connected: false, meta: 'Configure TWILIO_* in .env' },
  { nm: 'Aircall', logo: 'AC', bg: '#00b388', ds: 'Call center platform with live monitoring and analytics.', connected: false, meta: 'Not connected' },
  { nm: 'RingCentral', logo: 'RC', bg: '#0684bc', ds: 'Enterprise cloud communications and team messaging.', connected: false, meta: 'Not connected' },
  { nm: 'JustCall', logo: 'JC', bg: '#1a6dff', ds: 'Sales dialer with SMS automation and CRM sync.', connected: false, meta: 'Not connected' },
  { nm: 'Dialpad', logo: 'DP', bg: '#7c52ff', ds: 'AI business phone with real-time transcription.', connected: false, meta: 'Not connected' },
];
const SYNC = [
  ['10:42 AM', 'Frank Delgado', 'Brightline Tax', 'OpenPhone', '4m 25s', true],
  ['10:38 AM', 'Della Marsh', 'Summit Bookkeeping', 'OpenPhone', '2m 10s', true],
  ['10:31 AM', 'Lena Cho', 'Cedar CPA Group', 'Twilio', '6m 02s', true],
  ['10:24 AM', 'Chris Vaughn', 'Harbor Financial', 'OpenPhone', '1m 48s', false],
] as const;
const RECS = [
  ['Brightline Tax', 'Frank Delgado', '4m 25s', 'Today 10:42 AM', 'Closed Deal'],
  ['Cedar CPA Group', 'Lena Cho', '6m 02s', 'Today 10:31 AM', 'Interested'],
  ['Summit Bookkeeping', 'Della Marsh', '2m 10s', 'Today 10:38 AM', 'Callback'],
] as const;

const TABS = ['Connections', 'Call Sync', 'Recordings', 'Contact Sync'] as const;
type Tab = (typeof TABS)[number];

export default function IntegrationsPage() {
  const [tab, setTab] = useState<Tab>('Connections');
  const { data: cfg } = useQuery({ queryKey: ['config-status'], queryFn: configApi.status, retry: false });
  // Live OpenPhone check (lists workspace numbers) — also surfaces sandbox mode.
  const { data: op } = useQuery({ queryKey: ['openphone-status'], queryFn: openphoneApi.status, retry: false });

  // Connection state reflects live env config (/config/status) + OpenPhone probe.
  const INTEGRATIONS = BASE_INTEGRATIONS.map((i) => {
    if (i.nm === 'Twilio') {
      const on = cfg?.calling.configured ?? false;
      return { ...i, connected: on, meta: on ? 'Connected · live credentials' : i.meta };
    }
    if (i.nm === 'OpenPhone') {
      const on = (cfg?.openphone.configured ?? false) && (op?.connected ?? false);
      const sandbox = op?.sandbox ?? true;
      return {
        ...i,
        connected: on,
        meta: on
          ? `Connected · ${op?.phoneNumbers.length ?? 0} number(s)`
          : sandbox
            ? 'Sandbox mode · set OPENPHONE_API_KEY to connect'
            : op?.error ?? 'Not connected',
      };
    }
    if (i.nm === 'Quo') {
      const on = cfg?.quo.configured ?? false;
      return {
        ...i,
        connected: on,
        meta: on ? 'Connected · live credentials' : 'Sandbox mode · set QUO_BASE_URL + QUO_API_KEY',
      };
    }
    return i;
  });
  const activeConnections = INTEGRATIONS.filter((i) => i.connected).length;

  const syncColumns = useMemo<ColumnDef<SyncRow>[]>(() => [
    { key: 'time', header: 'Time', required: true, cellClassName: 'font-mono text-[12px]', render: (r) => r[0] },
    { key: 'caller', header: 'Caller', render: (r) => <div className="flex items-center gap-[10px]"><Avatar name={r[1]} /><span className="font-semibold">{r[1]}</span></div> },
    { key: 'lead', header: 'Lead', render: (r) => r[2] },
    { key: 'source', header: 'Source', render: (r) => <span className="rounded bg-muted px-2 py-0.5 text-[11.5px] font-semibold">{r[3]}</span> },
    { key: 'duration', header: 'Duration', cellClassName: 'font-mono', render: (r) => r[4] },
    { key: 'status', header: 'Status', render: (r) => r[5] ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7eed8] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#42512f]"><span className="h-1.5 w-1.5 rounded-full bg-[#42512f]" /> Synced</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f0f8] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#2c5d8f]"><span className="h-1.5 w-1.5 rounded-full bg-[#2c5d8f]" /> Syncing…</span> },
  ], []);

  return (
    <div>
      <PageHead lead="Connect calling platforms and manage call sync, recordings, and contact data.">
        <button className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted"><KeyRound className="h-4 w-4" /> API Keys</button>
      </PageHead>

      <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <KpiCard icon={Phone} iconBg="#e7eed8" iconColor="#42512f" value="1,284" label="Calls Synced (30d)" trend="9%" trendDir="up" />
        <KpiCard icon={Mic} iconBg="#fdecdc" iconColor="#c98a18" value="1,201" label="Recordings Stored" />
        <KpiCard icon={Users} iconBg="#dff0ec" iconColor="#2f6f63" value="2,940" label="Contacts Synced" />
        <KpiCard icon={CheckCircle2} iconBg="#e7eed8" iconColor="#42512f" value={activeConnections} label="Active Connections" />
      </div>

      <div className="mb-[18px] flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-[11px] text-[13.5px] font-semibold ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Connections' && (
        <div className="grid gap-3.5 md:grid-cols-2">
          {INTEGRATIONS.map((i) => (
            <div key={i.nm} className="flex items-start gap-3.5 rounded-2xl border bg-card p-[18px] shadow-sm">
              <div className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[12px] font-display font-bold text-white" style={{ background: i.bg }}>{i.logo}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold">{i.nm} {i.connected && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7eed8] px-2 py-px text-[11px] font-semibold text-[#42512f]"><span className="h-1.5 w-1.5 rounded-full bg-[#42512f]" /> Connected</span>}</div>
                <div className="mt-0.5 max-w-[46ch] text-[12.5px] text-muted-foreground">{i.ds}</div>
                <div className="mt-[7px] text-[12px] text-muted-foreground">{i.meta}</div>
              </div>
              <button className={`rounded-md px-[15px] py-[9px] text-[13px] font-semibold ${i.connected ? 'border bg-card hover:bg-muted' : 'bg-primary text-primary-foreground'}`}>{i.connected ? 'Manage' : 'Connect'}</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Call Sync' && (
        <DataTable
          tableKey="integrations-callsync"
          columns={syncColumns}
          rows={SYNC as unknown as SyncRow[]}
          getRowKey={(r) => r[0]}
          title="Call Sync Dashboard"
          subtitle="Live sync from connected dialers"
          emptyText="No synced calls."
          toolbar={<span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7eed8] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#42512f]"><span className="h-1.5 w-1.5 rounded-full bg-[#42512f]" /> Auto-sync on</span>}
        />
      )}

      {tab === 'Recordings' && (
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-[18px] py-4"><h3 className="font-display text-[15px] font-semibold">Call Recording Management</h3><div className="text-xs text-muted-foreground">Access-controlled — Admin &amp; Team Leader only</div></div>
          <div className="p-[18px]">
            {RECS.map((r) => (
              <div key={r[0]} className="flex items-center gap-3.5 border-b py-3.5 last:border-0">
                <button className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="ml-0.5 h-4 w-4" /></button>
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold">{r[0]} <span className="text-[12px] text-muted-foreground">· {r[1]}</span></div>
                  <div className="mt-1.5 flex h-[26px] items-center gap-0.5">{Array.from({ length: 42 }).map((_, i) => <i key={i} className="flex-1 rounded-[2px] bg-[#94ab68]" style={{ height: `${20 + ((i * 37) % 80)}%` }} />)}</div>
                </div>
                <div className="shrink-0 text-right"><div className="font-mono text-[13px] font-semibold">{r[2]}</div><div className="text-[12px] text-muted-foreground">{r[3]}</div></div>
                <span className="rounded bg-muted px-2 py-0.5 text-[11.5px] font-semibold">{r[4]}</span>
                <button className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted"><Download className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Contact Sync' && (
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-[18px] py-4"><div><h3 className="font-display text-[15px] font-semibold">Contact Sync</h3><div className="text-xs text-muted-foreground">Two-way sync between CRM and platforms</div></div><button className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground"><RefreshCw className="h-4 w-4" /> Sync Now</button></div>
          <div className="p-[18px]">
            <div className="grid grid-cols-2 gap-[18px] border-b pb-5 sm:grid-cols-4">
              {[['2,940', 'Total Contacts'], ['2,940', 'In Sync'], ['0', 'Conflicts'], ['2 min ago', 'Last Sync']].map(([v, l]) => <div key={l}><div className="font-display text-[24px] font-semibold">{v}</div><div className="text-[12px] text-muted-foreground">{l}</div></div>)}
            </div>
            <div className="flex items-center justify-center gap-[30px] py-3.5">
              <div className="text-center"><div className="mx-auto mb-2.5 grid h-[58px] w-[58px] place-items-center rounded-[15px] bg-[#42512f] font-display text-[17px] font-bold text-white">CRM</div><b className="block text-[14px]">Ranger CRM</b><span className="text-[12px] text-muted-foreground">2,940 contacts</span></div>
              <div className="text-center text-[#556b34]"><RefreshCw className="mx-auto mb-1 h-[30px] w-[30px]" /><span className="text-[12px] text-muted-foreground">Two-way · auto</span></div>
              <div className="text-center"><div className="mx-auto mb-2.5 grid h-[58px] w-[58px] place-items-center rounded-[15px] font-display text-[17px] font-bold text-white" style={{ background: '#5b5bd6' }}>OP</div><b className="block text-[14px]">OpenPhone</b><span className="text-[12px] text-muted-foreground">2,940 contacts</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
