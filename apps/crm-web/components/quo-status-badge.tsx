import type { QuoStatus } from '@/lib/leads';

const MAP: Record<QuoStatus, { label: string; cls: string }> = {
  not_synced: { label: 'Not synced', cls: 'bg-muted text-muted-foreground' },
  pending: { label: 'Syncing…', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  synced: { label: 'Synced', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  failed: { label: 'Failed', cls: 'bg-red-500/15 text-red-600 dark:text-red-400' },
};

export function QuoStatusBadge({ status }: { status: QuoStatus }) {
  const { label, cls } = MAP[status] ?? MAP.not_synced;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
