'use client';

import { useQuery } from '@tanstack/react-query';
import { activitiesApi } from '@/lib/crm';

export default function SecurityPage() {
  const { data: activities = [], isLoading, isError } = useQuery({
    queryKey: ['activities'],
    queryFn: activitiesApi.list,
    retry: false,
  });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Audit / activity log — every status change and call is recorded (SEC-004)
      </p>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Lead</th>
              <th className="px-4 py-2.5 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-500">
                  Could not load activity log (admin or team-leader role required).
                </td>
              </tr>
            )}
            {!isLoading && !isError && activities.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No activity recorded yet — complete a call to generate audit entries.
                </td>
              </tr>
            )}
            {activities.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2.5">{a.user?.name ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{a.action}</span>
                </td>
                <td className="px-4 py-2.5">{a.lead?.businessName ?? '—'}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {a.oldValue ? `${a.oldValue} → ` : ''}
                  {a.newValue ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
