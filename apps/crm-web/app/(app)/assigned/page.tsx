'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Plus, Pencil } from 'lucide-react';
import { productivityApi } from '@/lib/crm';
import { PageHead, Avatar } from '@/components/page-head';

export default function AssignedPage() {
  const router = useRouter();
  const { data: callers = [] } = useQuery({ queryKey: ['productivity'], queryFn: productivityApi.perCaller });

  return (
    <div>
      <PageHead lead="Daily call assignments across the team. Distribute by count, state, timezone, or performance.">
        <button onClick={() => router.push('/assignments')} className="inline-flex items-center gap-2 rounded-md border bg-card px-[15px] py-[9px] text-[13px] font-semibold hover:bg-muted"><RefreshCw className="h-4 w-4" /> Auto-distribute</button>
        <button onClick={() => router.push('/assignments')} className="inline-flex items-center gap-2 rounded-md bg-primary px-[15px] py-[9px] text-[13px] font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-4 w-4" /> Assign calls</button>
      </PageHead>

      <div className="mb-[18px] grid gap-[18px] md:grid-cols-2 xl:grid-cols-3">
        {callers.slice(0, 3).map((c) => {
          const pct = c.assigned ? Math.round((c.leadsCompleted / c.assigned) * 100) : 0;
          return (
            <div key={c.id} className="rounded-2xl border bg-card p-[18px] shadow-sm">
              <div className="mb-[14px] flex items-center gap-3">
                <Avatar name={c.name} size="md" />
                <div className="min-w-0 flex-1"><div className="truncate font-bold">{c.name}</div><div className="text-[12px] text-muted-foreground">Caller</div></div>
                <span className="rounded-full bg-[#e7eed8] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#42512f]">{c.assigned} leads</span>
              </div>
              <div className="mb-1.5 flex justify-between text-[12px]"><span className="text-muted-foreground">Progress</span><b>{pct}%</b></div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e7eed8]"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#556b34,#6f8745)' }} /></div>
              <div className="mt-3 flex justify-between text-[12.5px] text-muted-foreground"><span>{c.leadsCompleted} done</span><span>{c.assigned - c.leadsCompleted} left</span></div>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-[18px] py-4"><h3 className="font-display text-[15px] font-semibold">Assignment Detail</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">
                <th className="px-4 py-[11px] font-semibold">Caller</th>
                <th className="px-4 py-[11px] text-right font-semibold">Assigned</th>
                <th className="px-4 py-[11px] text-right font-semibold">Completed</th>
                <th className="px-4 py-[11px] text-right font-semibold">Pending</th>
                <th className="px-4 py-[11px] font-semibold">Distribution</th>
                <th className="px-4 py-[11px] font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {callers.map((c) => {
                const pct = c.assigned ? Math.round((c.leadsCompleted / c.assigned) * 100) : 0;
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3"><div className="flex items-center gap-[10px]"><Avatar name={c.name} size="md" /><span className="font-semibold">{c.name}</span></div></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{c.assigned}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-primary">{c.leadsCompleted}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.assigned - c.leadsCompleted}</td>
                    <td className="px-4 py-3" style={{ minWidth: 130 }}><div className="h-2 overflow-hidden rounded-full bg-[#e7eed8]"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#556b34,#6f8745)' }} /></div></td>
                    <td className="px-4 py-3"><button onClick={() => router.push('/assignments')} className="grid h-[30px] w-[30px] place-items-center rounded-lg border hover:bg-primary hover:text-primary-foreground"><Pencil className="h-[15px] w-[15px]" /></button></td>
                  </tr>
                );
              })}
              {callers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
