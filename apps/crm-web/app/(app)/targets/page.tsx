'use client';

import { useQuery } from '@tanstack/react-query';
import { targetsApi } from '@/lib/crm';

export default function TargetsPage() {
  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['targets'],
    queryFn: targetsApi.list,
  });

  const totalTarget = targets.reduce((a, t) => a + t.monthlyTarget, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {targets.length} city targets · {totalTarget.toLocaleString()} planned leads (MET-003)
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Timezone</th>
              <th className="px-4 py-2.5 font-medium">State</th>
              <th className="px-4 py-2.5 font-medium">City</th>
              <th className="px-4 py-2.5 text-right font-medium">Monthly Target</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && targets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No targets configured.
                </td>
              </tr>
            )}
            {targets.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                    {t.timezone}
                  </span>
                </td>
                <td className="px-4 py-2.5">{t.state}</td>
                <td className="px-4 py-2.5 font-medium">{t.city}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {t.monthlyTarget.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
