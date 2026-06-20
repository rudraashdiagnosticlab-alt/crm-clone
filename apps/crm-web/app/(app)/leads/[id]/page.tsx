'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { leadsApi } from '@/lib/leads';
import { QuoStatusBadge } from '@/components/quo-status-badge';

export default function LeadDetailPage() {
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.get(id),
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
      <div className="flex items-center gap-4">
        <Link href="/leads" className="text-sm text-muted-foreground hover:underline">
          ← Leads
        </Link>
        <h1 className="text-lg font-semibold">{lead.businessName}</h1>
      </div>

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
    </div>
  );
}
