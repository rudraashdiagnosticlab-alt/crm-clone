'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activitiesApi, type Activity } from '@/lib/crm';
import { DataTable, type ColumnDef } from '@/components/data-table';

export default function SecurityPage() {
  const { data: activities = [], isLoading, isError } = useQuery({
    queryKey: ['activities'],
    queryFn: activitiesApi.list,
    retry: false,
  });

  const columns = useMemo<ColumnDef<Activity>[]>(() => [
    { key: 'when', header: 'When', required: true, cellClassName: 'text-muted-foreground', render: (a) => new Date(a.createdAt).toLocaleString() },
    { key: 'user', header: 'User', render: (a) => a.user?.name ?? '—' },
    { key: 'action', header: 'Action', render: (a) => <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{a.action}</span> },
    { key: 'lead', header: 'Lead', render: (a) => a.lead?.businessName ?? '—' },
    { key: 'detail', header: 'Detail', cellClassName: 'text-muted-foreground', render: (a) => `${a.oldValue ? `${a.oldValue} → ` : ''}${a.newValue ?? ''}` },
  ], []);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Audit / activity log — every status change and call is recorded (SEC-004)
      </p>

      <DataTable
        tableKey="security-audit"
        columns={columns}
        rows={isError ? [] : activities}
        getRowKey={(a) => a.id}
        title="Audit Log"
        subtitle={`${activities.length} entries`}
        loading={isLoading}
        emptyText={isError ? 'Could not load activity log (admin or team-leader role required).' : 'No activity recorded yet — complete a call to generate audit entries.'}
      />
    </div>
  );
}
