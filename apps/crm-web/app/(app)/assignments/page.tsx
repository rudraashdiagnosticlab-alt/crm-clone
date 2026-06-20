'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi } from '@/lib/crm';

type Strategy = 'equal' | 'state' | 'timezone';

export default function AssignmentsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [strategy, setStrategy] = useState<Strategy>('equal');

  const { data, isLoading } = useQuery({
    queryKey: ['assignments-summary'],
    queryFn: assignmentsApi.summary,
  });

  const auto = useMutation({
    mutationFn: () => assignmentsApi.auto({ callerIds: [...selected], strategy }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments-summary'] }),
  });

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data?.unassigned ?? 0} unassigned leads · select callers and auto-distribute (RES-003..005)
        </p>
        <div className="flex items-center gap-2">
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as Strategy)}
            className="rounded-md border bg-card px-3 py-1.5 text-sm"
          >
            <option value="equal">Equal count</option>
            <option value="state">By state</option>
            <option value="timezone">By timezone</option>
          </select>
          <button
            disabled={selected.size === 0 || (data?.unassigned ?? 0) === 0 || auto.isPending}
            onClick={() => auto.mutate()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {auto.isPending ? 'Distributing…' : `Distribute to ${selected.size} caller(s)`}
          </button>
        </div>
      </div>

      {auto.isSuccess && (
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Assigned {auto.data.assigned} leads across {Object.keys(auto.data.perCaller).length} caller(s).
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-2.5"></th>
              <th className="px-4 py-2.5 font-medium">Caller</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 text-right font-medium">Assigned Leads</th>
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
            {data?.callers.map((c) => (
              <tr
                key={c.id}
                onClick={() => toggle(c.id)}
                className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-2.5">
                  <input type="checkbox" checked={selected.has(c.id)} readOnly className="pointer-events-none" />
                </td>
                <td className="px-4 py-2.5 font-medium">{c.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{c.email}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{c.leadCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
