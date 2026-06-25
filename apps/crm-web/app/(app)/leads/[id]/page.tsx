'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Phone, MessageSquare, Info } from 'lucide-react';
import { leadsApi } from '@/lib/leads';
import { communicationsApi } from '@/lib/crm';
import { QuoStatusBadge } from '@/components/quo-status-badge';
import { ZoomTimeline } from '@/components/zoom-timeline';
import { LeadActivityDrawer } from '@/components/lead-activity-log';
import { api } from '@/lib/api';

const SMS_TEMPLATES: { label: string; text: (name: string) => string }[] = [
  { label: 'Intro', text: (n) => `Hi, this is the team at Milta reaching out about ${n}. Is now a good time to chat?` },
  { label: 'Follow-up', text: () => `Just following up on our last conversation — happy to answer any questions when you're free.` },
  { label: 'Missed you', text: () => `Sorry we missed you! Reply here or let us know a good time to call back.` },
];

export default function LeadDetailPage() {
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsBody, setSmsBody] = useState('');

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.get(id),
  });

  // Current user — the Activity Log is restricted to Admin & Team Lead.
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: async () => (await api.get('/auth/me')).data, retry: false });
  const canSeeActivity = me?.role === 'admin' || me?.role === 'team_leader';
  const [showActivity, setShowActivity] = useState(false);

  const { data: timeline = [] } = useQuery({
    queryKey: ['lead', id, 'timeline'],
    queryFn: () => communicationsApi.timeline(id),
  });

  const refreshTimeline = () => {
    qc.invalidateQueries({ queryKey: ['lead', id, 'timeline'] });
    qc.invalidateQueries({ queryKey: ['lead', id, 'activities'] });
  };
  const call = useMutation({
    mutationFn: () => communicationsApi.startCall(id),
    onSuccess: (res) => {
      // Queue-routed (Quo): the call is placed server-side — no tel: handoff.
      // Fallback (no queue): open the agent's dialer via the tel: link.
      if (!res.queued && res.tel && typeof window !== 'undefined') window.location.href = res.tel;
      refreshTimeline();
    },
  });
  const sms = useMutation({
    mutationFn: () => communicationsApi.sendSms(id, smsBody),
    onSuccess: () => { setSmsBody(''); setSmsOpen(false); refreshTimeline(); },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['lead', id, 'quo-logs'],
    queryFn: () => leadsApi.quoLogs(id),
  });

  const sync = useMutation({
    mutationFn: () => leadsApi.syncToQuo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead', id] });
      qc.invalidateQueries({ queryKey: ['lead', id, 'quo-logs'] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  if (isLoading || !lead) {
    return <div className="p-6 text-muted-foreground">Loading…</div>;
  }

  const field = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/leads" className="text-sm text-muted-foreground hover:underline">
          ← Leads
        </Link>
        <h1 className="text-lg font-semibold">{lead.leadId}</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => call.mutate()}
            disabled={call.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Phone className="h-4 w-4" /> {call.isPending ? 'Dialing…' : call.data?.queued ? 'Queued via Quo' : 'Call'}
          </button>
          <button
            onClick={() => setSmsOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted"
          >
            <MessageSquare className="h-4 w-4" /> Send SMS
          </button>
          {canSeeActivity && (
            <button
              onClick={() => setShowActivity(true)}
              title="Activity log"
              aria-label="Activity log"
              className="inline-flex items-center gap-2 rounded-md border bg-card px-[12px] py-[9px] text-[13px] font-semibold hover:bg-muted"
            >
              <Info className="h-4 w-4" /> Activity
            </button>
          )}
        </div>
      </div>

      {smsOpen && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold">Send SMS to {lead.phone}</span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {SMS_TEMPLATES.map((t) => (
                <button key={t.label} onClick={() => setSmsBody(t.text(lead.contactName ?? lead.leadId))} className="rounded-full border px-2.5 py-1 text-[11.5px] font-medium hover:bg-muted">
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} rows={3} placeholder="Type a message or pick a template…" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11.5px] text-muted-foreground">{smsBody.length}/1600{sms.isError ? ' · failed to send' : ''}</span>
            <div className="flex gap-2">
              <button onClick={() => { setSmsOpen(false); setSmsBody(''); }} className="rounded-md border bg-card px-3 py-2 text-[13px] font-semibold hover:bg-muted">Cancel</button>
              <button onClick={() => sms.mutate()} disabled={sms.isPending || !smsBody.trim()} className="rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-60">
                {sms.isPending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lead info */}
        <div className="rounded-lg border bg-card p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold">Lead Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            {field('Lead ID', lead.leadId)}
            {field('Status', <span className="capitalize">{lead.status.replace('_', ' ')}</span>)}
            {field('Phone', lead.phone)}
            {field('Email', lead.email)}
            {field('City', lead.city)}
            {field('State', lead.state)}
            {field('Timezone', lead.timezone)}
            {field('Created', new Date(lead.createdAt).toLocaleString())}
          </dl>
        </div>

        {/* Quo integration panel */}
        <div className="rounded-lg border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold">Quo Integration</h2>
              <QuoStatusBadge status={lead.quoStatus} />
            </div>
            <button
              onClick={() => sync.mutate()}
              disabled={sync.isPending || lead.quoStatus === 'pending'}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {sync.isPending
                ? 'Sending…'
                : lead.quoStatus === 'synced'
                  ? 'Re-send to Quo'
                  : 'Send to Quo'}
            </button>
          </div>

          <dl className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {field('Quo Lead ID', lead.quoExternalId)}
            {field('Last synced', lead.quoSyncedAt ? new Date(lead.quoSyncedAt).toLocaleString() : null)}
            {field('Sync attempts', String(logs.length))}
          </dl>

          {/* Error handling surface */}
          {lead.quoStatus === 'failed' && lead.quoError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
            >
              <strong>Quo error:</strong> {lead.quoError}
            </motion.div>
          )}

          {/* Stored response */}
          {lead.quoResponse != null && (
            <div className="mb-4">
              <p className="mb-1 text-xs text-muted-foreground">Stored Quo response</p>
              <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(lead.quoResponse, null, 2)}
              </pre>
            </div>
          )}

          {/* Sync history */}
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Sync history</p>
            <div className="space-y-2">
              {logs.length === 0 && <p className="text-sm text-muted-foreground">No attempts yet.</p>}
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${log.success ? 'bg-emerald-500' : 'bg-red-500'}`}
                    />
                    {log.success ? 'Success' : 'Failed'}
                    {log.statusCode ? ` · HTTP ${log.statusCode}` : ''}
                    {log.error ? ` · ${log.error}` : ''}
                  </span>
                  <span className="text-muted-foreground">
                    {log.durationMs != null ? `${log.durationMs}ms · ` : ''}
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Conversation timeline — calls, SMS & notes (Quo / OpenPhone) */}
      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Conversation Timeline</h2>
        {timeline.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No communications yet. Calls and SMS sync here automatically via Quo webhooks.
          </p>
        )}
        <div className="space-y-2.5">
          {timeline.map((t) => {
            const inbound = t.direction === 'inbound';
            const tone = t.kind === 'call' ? '#2c5d8f' : t.kind === 'message' ? '#42512f' : '#c98a18';
            const label = t.kind === 'call' ? `${inbound ? 'Inbound' : 'Outbound'} call` : t.kind === 'message' ? `${inbound ? 'Inbound' : 'Outbound'} SMS` : 'Note';
            return (
              <div key={`${t.kind}-${t.id}`} className="flex gap-3 rounded-md border px-3 py-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: tone }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold">
                      {label}
                      {t.status ? <span className="ml-2 font-normal text-muted-foreground">· {t.status}</span> : ''}
                      {typeof t.durationSecs === 'number' ? <span className="ml-2 font-normal text-muted-foreground">· {t.durationSecs}s</span> : ''}
                      {t.by ? <span className="ml-2 font-normal text-muted-foreground">· {t.by}</span> : ''}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-muted-foreground">{new Date(t.at).toLocaleString()}</span>
                  </div>
                  {t.body && <p className="mt-1 whitespace-pre-wrap text-[13px] text-foreground">{t.body}</p>}
                  {t.aiSummary && <p className="mt-1 text-[12.5px] text-muted-foreground"><strong>AI summary:</strong> {t.aiSummary}</p>}
                  {t.transcript && <details className="mt-1 text-[12.5px] text-muted-foreground"><summary className="cursor-pointer">Transcript</summary><p className="mt-1 whitespace-pre-wrap">{t.transcript}</p></details>}
                  {t.recordingUrl && <a href={t.recordingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[12.5px] font-medium text-primary hover:underline">▶ Recording</a>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Complete Zoom meeting history/timeline for this client */}
      <ZoomTimeline leadId={id} />

      {/* Full audit trail — opened from the Info (ⓘ) action; Admin & Team Lead only */}
      {canSeeActivity && showActivity && (
        <LeadActivityDrawer leadId={id} leadName={lead.businessName} onClose={() => setShowActivity(false)} />
      )}
    </div>
  );
}
