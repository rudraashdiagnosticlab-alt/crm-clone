'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Mic, Pause, Check, Calendar, Target, CheckCircle2, Clock, Percent } from 'lucide-react';
import { callsApi, formatDuration, type CallOutcome } from '@/lib/crm';
import type { Lead } from '@/lib/leads';
import { PageHead, Avatar } from '@/components/page-head';
import { StatusPill } from '@/components/status-pill';
import { KpiCard } from '@/components/dashboard/kpi-card';

const OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: 'callback', label: 'Callback' },
  { value: 'interested', label: 'Interested' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'closed_deal', label: 'Closed Deal' },
  { value: 'follow_up_required', label: 'Follow-up Required' },
];

export default function CallingPage() {
  const qc = useQueryClient();
  const [active, setActive] = useState<{ callId: string; lead: Lead; startedAt: number } | null>(null);
  const [live, setLive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState('');
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: dash } = useQuery({ queryKey: ['caller-dash'], queryFn: callsApi.dashboard });
  const { data: leads = [] } = useQuery({ queryKey: ['caller-leads'], queryFn: callsApi.myLeads });

  const current = active?.lead ?? leads.find((l) => l.status !== 'closed' && l.status !== 'rejected') ?? leads[0];

  useEffect(() => {
    if (!live || !active) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - active.startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [live, active]);

  async function startCall() {
    if (!current) return;
    setBusy(true);
    try {
      const call = await callsApi.start(current.id);
      setActive({ callId: call.id, lead: current, startedAt: Date.now() });
      setLive(true);
      setElapsed(0);
      setNote('');
      setOutcome(null);
    } finally {
      setBusy(false);
    }
  }

  async function saveAndNext() {
    if (!active || !outcome) return;
    setBusy(true);
    try {
      await callsApi.end(active.callId, outcome, elapsed);
      if (note.trim()) await callsApi.addNote(active.callId, note.trim());
      setActive(null);
      setLive(false);
      setElapsed(0);
      setNote('');
      setOutcome(null);
      qc.invalidateQueries({ queryKey: ['caller-dash'] });
      qc.invalidateQueries({ queryKey: ['caller-leads'] });
    } finally {
      setBusy(false);
    }
  }

  const remaining = leads.filter((l) => l.status !== 'closed' && l.status !== 'rejected').length;

  return (
    <div>
      <PageHead lead="Auto-advancing dialer. Calls log start/end time, duration, recording, and outcome automatically.">
        <StatusPill status={live ? 'On Call' : 'Idle'} kind="presence" />
      </PageHead>

      {/* KPIs */}
      <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <KpiCard icon={Target} iconBg="#e7eed8" iconColor="#42512f" value={dash?.assignedLeads ?? 0} label="Assigned Leads" />
        <KpiCard icon={CheckCircle2} iconBg="#e8f2e4" iconColor="#3f7a32" value={dash?.callsCompleted ?? 0} label="Calls Completed" />
        <KpiCard icon={Clock} iconBg="#fbf3e2" iconColor="#c98a18" value={dash?.pendingLeads ?? 0} label="Pending" />
        <KpiCard icon={Phone} iconBg="#e3f1ee" iconColor="#2f6f63" value={formatDuration(dash?.productiveSecs ?? 0)} label="Productive Time" />
        <KpiCard icon={Percent} iconBg="#e7f0f8" iconColor="#2c5d8f" value={formatDuration(dash?.avgCallSecs ?? 0)} label="Avg Call" />
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[1fr_360px]">
        {/* Left: call card + notes */}
        <div className="space-y-[18px]">
          <div className="relative overflow-hidden rounded-[22px] p-6 text-white shadow-md" style={{ background: 'linear-gradient(165deg,#27301d,#1c2316)' }}>
            <svg className="pointer-events-none absolute inset-0 opacity-[.13]" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">
              <g fill="none" stroke="#9bb56a" strokeWidth="1">
                <path d="M-50 80 Q150 30 350 90 T780 80" /><path d="M-50 160 Q180 100 360 180 T800 160" />
                <path d="M-50 250 Q160 190 380 270 T820 250" /><path d="M-50 340 Q200 280 400 360 T840 340" />
              </g>
            </svg>
            <div className="relative z-[2]">
              {current ? (
                <>
                  <div className="mb-[18px] flex items-center gap-[14px]">
                    <Avatar name={current.businessName} size="lg" />
                    <div>
                      <div className="font-display text-[20px] font-semibold">{current.businessName}</div>
                      <div className="text-[13px] text-[#94ab68]">{current.leadId}</div>
                    </div>
                  </div>
                  <div className="mb-1 font-mono text-[15px] tracking-[.02em] text-[#e7eed8]">{current.phone}</div>
                  <div className="my-[18px] flex flex-wrap gap-5">
                    <div><div className="text-[11px] uppercase tracking-[.1em] text-[#6f8745]">Location</div><div className="mt-0.5 font-display text-[16px] font-semibold">{current.city}, {current.state}</div></div>
                    <div><div className="text-[11px] uppercase tracking-[.1em] text-[#6f8745]">Timezone</div><div className="mt-0.5 font-display text-[16px] font-semibold">{current.timezone}</div></div>
                    <div><div className="text-[11px] uppercase tracking-[.1em] text-[#6f8745]">Status</div><div className="mt-0.5 font-display text-[16px] font-semibold capitalize">{current.status.replace('_', ' ')}</div></div>
                  </div>
                  <div className={`my-2 text-center font-mono text-[42px] font-semibold ${live ? 'text-[#bfe39a]' : 'text-white'}`}>
                    {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    {!live ? (
                      <button onClick={startCall} disabled={busy} title="Start call" className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#3f7a32] text-white shadow-[0_8px_20px_rgba(63,122,50,.5)] disabled:opacity-60">
                        <Phone className="h-[26px] w-[26px]" />
                      </button>
                    ) : (
                      <>
                        <button title="Mute" className="grid h-[54px] w-[54px] place-items-center rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/20"><Mic className="h-[22px] w-[22px]" /></button>
                        <button title="Hold" className="grid h-[54px] w-[54px] place-items-center rounded-2xl border border-white/10 bg-white/10 text-white hover:bg-white/20"><Pause className="h-[22px] w-[22px]" /></button>
                        <button onClick={() => setLive(false)} title="End call" className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#9e2b21] text-white shadow-[0_8px_20px_rgba(158,43,33,.5)]">
                          <Phone className="h-[26px] w-[26px] rotate-[135deg]" />
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-[#94ab68]">No leads assigned to you.</div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-2xl border bg-card shadow-sm">
            <div className="border-b px-[18px] py-4"><h3 className="font-display text-[15px] font-semibold">Call Notes</h3><div className="text-xs text-muted-foreground">Saved automatically with outcome</div></div>
            <div className="p-[18px]">
              <div className="mb-1.5 text-[11px] uppercase tracking-[.08em] text-muted-foreground">Outcome</div>
              <div className="mb-3.5 flex flex-wrap gap-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setOutcome(o.value)}
                    className={`rounded-full border-[1.5px] px-[13px] py-[7px] text-[12.5px] font-semibold transition-colors ${
                      outcome === o.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-[#27301d] hover:border-primary/50 dark:text-foreground'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="e.g. Client requested callback tomorrow at 4 PM. Interested in bookkeeping. Send pricing email."
                className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
              />
              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex items-center gap-[7px] rounded-md border bg-card px-3 py-2 text-[13px] font-medium">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <select className="border-none bg-transparent outline-none"><option>No follow-up</option><option>Tomorrow 4:00 PM</option><option>In 2 days</option><option>Next week</option></select>
                </div>
                <button onClick={saveAndNext} disabled={!active || !outcome || busy} className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
                  <Check className="h-4 w-4" /> Save &amp; next lead
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: queue */}
        <div className="space-y-[18px]">
          <div className="rounded-2xl border bg-card shadow-sm">
            <div className="border-b px-[18px] py-4"><h3 className="font-display text-[15px] font-semibold">Your Queue</h3><div className="text-xs text-muted-foreground">{remaining} remaining</div></div>
            <div className="max-h-[560px] overflow-y-auto p-[18px]">
              {leads.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No leads assigned.</p>}
              {leads.map((q, i) => {
                const done = q.status === 'closed' || q.status === 'rejected';
                const isCurrent = current?.id === q.id && !done;
                return (
                  <div key={q.id} className={`mb-[9px] flex items-center gap-[11px] rounded-[11px] border p-3 ${isCurrent ? 'border-[#556b34] bg-muted shadow-[inset_3px_0_0_#42512f]' : 'hover:bg-muted/50'}`}>
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-[#e7eed8] text-[11px] font-bold text-[#42512f]">{done ? '✓' : i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{q.businessName}</div>
                      <div className="truncate font-mono text-[11.5px] text-muted-foreground">{q.phone}</div>
                    </div>
                    {done ? <StatusPill status={q.status} /> : isCurrent ? <StatusPill status="in_progress" /> : <span className="text-[11px] text-muted-foreground">{q.timezone}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-[14px] rounded-2xl border bg-card p-[18px] text-center shadow-sm">
            <div className="flex-1"><div className="font-display text-[20px] font-semibold text-primary">{dash?.callsCompleted ?? 0}</div><div className="text-[11px] text-muted-foreground">Completed</div></div>
            <div className="flex-1 border-x"><div className="font-display text-[20px] font-semibold">{dash?.assignedLeads ?? 0}</div><div className="text-[11px] text-muted-foreground">Assigned</div></div>
            <div className="flex-1"><div className="font-display text-[20px] font-semibold text-[#c98a18]">{formatDuration(dash?.productiveSecs ?? 0)}</div><div className="text-[11px] text-muted-foreground">Productive</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
