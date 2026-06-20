'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, PhoneOff } from 'lucide-react';
import { callsApi, formatDuration, type CallOutcome } from '@/lib/crm';
import type { Lead } from '@/lib/leads';

const OUTCOMES: { value: CallOutcome; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'callback', label: 'Callback' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'closed_deal', label: 'Closed Deal' },
  { value: 'follow_up_required', label: 'Follow-up' },
];

export default function CallingPage() {
  const qc = useQueryClient();
  const [active, setActive] = useState<{ callId: string; lead: Lead; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: dash } = useQuery({ queryKey: ['caller-dash'], queryFn: callsApi.dashboard });
  const { data: leads = [] } = useQuery({ queryKey: ['caller-leads'], queryFn: callsApi.myLeads });

  // CAL-011 — live timer
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - active.startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);

  async function startCall(lead: Lead) {
    setBusy(true);
    try {
      const call = await callsApi.start(lead.id);
      setActive({ callId: call.id, lead, startedAt: Date.now() });
      setElapsed(0);
      setNote('');
    } finally {
      setBusy(false);
    }
  }

  async function endCall(outcome: CallOutcome) {
    if (!active) return;
    setBusy(true);
    try {
      await callsApi.end(active.callId, outcome, elapsed);
      if (note.trim()) await callsApi.addNote(active.callId, note.trim());
      setActive(null);
      qc.invalidateQueries({ queryKey: ['caller-dash'] });
      qc.invalidateQueries({ queryKey: ['caller-leads'] });
    } finally {
      setBusy(false);
    }
  }

  const kpis = [
    { label: 'Assigned Leads', value: dash?.assignedLeads ?? 0 },
    { label: 'Calls Completed', value: dash?.callsCompleted ?? 0 },
    { label: 'Pending', value: dash?.pendingLeads ?? 0 },
    { label: 'Productive Time', value: formatDuration(dash?.productiveSecs ?? 0) },
    { label: 'Avg Call', value: formatDuration(dash?.avgCallSecs ?? 0) },
  ];

  return (
    <div className="space-y-5">
      {/* CAL-001..005 KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Active call panel */}
      {active && (
        <div className="rounded-lg border-2 border-primary bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">On call with</p>
              <p className="text-lg font-semibold">{active.lead.businessName}</p>
              <p className="text-sm text-muted-foreground">{active.lead.phone}</p>
            </div>
            <div className="text-3xl font-bold tabular-nums text-primary">{formatDuration(elapsed)}</div>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Call notes (e.g. Client requested callback tomorrow at 4 PM)…"
            className="mt-4 w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={2}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">End call with outcome:</span>
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                disabled={busy}
                onClick={() => endCall(o.value)}
                className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CAL-006 lead queue */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Business</th>
              <th className="px-4 py-2.5 font-medium">Phone</th>
              <th className="px-4 py-2.5 font-medium">Location</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No leads assigned to you.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{lead.businessName}</td>
                <td className="px-4 py-2.5">{lead.phone}</td>
                <td className="px-4 py-2.5">
                  {lead.city}, {lead.state}
                </td>
                <td className="px-4 py-2.5 capitalize">{lead.status.replace('_', ' ')}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    disabled={!!active || busy}
                    onClick={() => startCall(lead)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {active ? <PhoneOff className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                    Start Call
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
