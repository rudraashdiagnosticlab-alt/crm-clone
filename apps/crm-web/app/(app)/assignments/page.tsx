'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shuffle, Users } from 'lucide-react';
import { assignmentsApi } from '@/lib/crm';
import { PageHead, Avatar } from '@/components/page-head';
import { KpiCard } from '@/components/dashboard/kpi-card';

type Strategy = 'equal' | 'state' | 'timezone';

export default function AssignmentsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [strategy, setStrategy] = useState<Strategy>('equal');

  const { data } = useQuery({ queryKey: ['assignments-summary'], queryFn: assignmentsApi.summary });
  const auto = useMutation({
    mutationFn: () => assignmentsApi.auto({ callerIds: [...selected], strategy }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments-summary'] }),
  });

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const totalAssigned = data?.callers.reduce((a, c) => a + c.leadCount, 0) ?? 0;

  return (
    <div>
      <PageHead lead="Distribute leads to callers — manually or auto-balanced by equal count, state, or timezone.">
        <div className="flex items-center gap-[7px] rounded-md border bg-card px-3 py-2 text-[13px] font-medium">
          <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)} className="border-none bg-transparent font-medium outline-none">
            <option value="equal">Equal count</option>
            <option value="state">By state</option>
            <option value="timezone">By timezone</option>
          </select>
        </div>
        <button disabled={selected.size === 0 || (data?.unassigned ?? 0) === 0 || auto.isPending} onClick={() => auto.mutate()} className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
          {auto.isPending ? 'Distributing…' : `Distribute to ${selected.size}`}
        </button>
      </PageHead>

      <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <KpiCard icon={Users} iconBg="#fbf3e2" iconColor="#c98a18" value={data?.unassigned ?? 0} label="Unassigned Leads" />
        <KpiCard icon={Shuffle} iconBg="#e7eed8" iconColor="#42512f" value={totalAssigned.toLocaleString()} label="Assigned Leads" />
        <KpiCard icon={Users} iconBg="#e8f2e4" iconColor="#3f7a32" value={data?.callers.length ?? 0} label="Active Callers" />
      </div>

      {auto.isSuccess && (
        <div className="mb-4 rounded-md bg-[#e8f2e4] px-4 py-2.5 text-sm text-[#3f7a32]">
          Assigned {auto.data.assigned} leads across {Object.keys(auto.data.perCaller).length} caller(s).
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-[18px] py-4"><h3 className="font-display text-[15px] font-semibold">Callers</h3><div className="text-xs text-muted-foreground">Select callers, then distribute</div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">
                <th className="w-10 px-4 py-[11px]"></th>
                <th className="px-4 py-[11px] font-semibold">Caller</th>
                <th className="px-4 py-[11px] font-semibold">Email</th>
                <th className="px-4 py-[11px] text-right font-semibold">Assigned Leads</th>
              </tr>
            </thead>
            <tbody>
              {data?.callers.map((c) => (
                <tr key={c.id} onClick={() => toggle(c.id)} className="cursor-pointer border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(c.id)} readOnly className="pointer-events-none accent-[#42512f]" /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-[10px]"><Avatar name={c.name} /><span className="font-semibold">{c.name}</span></div></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{c.leadCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
