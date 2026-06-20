'use client';

import { useQuery } from '@tanstack/react-query';
import { productivityApi, formatDuration } from '@/lib/crm';

const STATUS_STYLE: Record<string, string> = {
  'On Call': 'bg-green-100 text-green-700',
  Idle: 'bg-muted text-muted-foreground',
  'Wrap-up': 'bg-amber-100 text-amber-700',
};

export default function ManagerPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['team-live'],
    queryFn: productivityApi.teamLive,
    refetchInterval: 10_000, // MGR-001 — live refresh
  });

  const kpis = data?.kpis;

  const cards = [
    { label: 'Total Calls Today', value: kpis?.totalCallsToday ?? 0 },
    { label: 'Total Talk Time', value: formatDuration(kpis?.totalTalkSecs ?? 0) },
    { label: 'Conversion Rate', value: `${kpis?.conversionRate ?? 0}%` },
    { label: 'Best Performer', value: kpis?.bestPerformer ? `${kpis.bestPerformer.name} (${kpis.bestPerformer.calls})` : '—' },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Live team status &amp; KPIs (MGR) · auto-refreshing</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Caller</th>
              <th className="px-4 py-2.5 font-medium">Current Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {data?.team.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{t.name}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status] ?? STATUS_STYLE.Idle}`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
