'use client';

import { useQuery } from '@tanstack/react-query';
import { Flag, MapPin, Building2 } from 'lucide-react';
import { targetsApi } from '@/lib/crm';
import { PageHead } from '@/components/page-head';
import { KpiCard } from '@/components/dashboard/kpi-card';

export default function TargetsPage() {
  const { data: targets = [], isLoading } = useQuery({ queryKey: ['targets'], queryFn: targetsApi.list });
  const totalTarget = targets.reduce((a, t) => a + t.monthlyTarget, 0);
  const cities = new Set(targets.map((t) => `${t.state}/${t.city}`)).size;
  const states = new Set(targets.map((t) => t.state)).size;

  return (
    <div>
      <PageHead lead="Per-city lead targets used in progress calculations across the dashboard and pivot." />

      <div className="mb-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <KpiCard icon={Flag} iconBg="#e7eed8" iconColor="#42512f" value={totalTarget.toLocaleString()} label="Total Planned Leads" />
        <KpiCard icon={Building2} iconBg="#e7f0f8" iconColor="#2c5d8f" value={cities} label="Cities with Targets" />
        <KpiCard icon={MapPin} iconBg="#fbf3e2" iconColor="#c98a18" value={states} label="States Covered" />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b px-[18px] py-4"><h3 className="font-display text-[15px] font-semibold">City Targets</h3><div className="text-xs text-muted-foreground">{targets.length} configured</div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b bg-background text-left text-[11px] uppercase tracking-[.06em] text-muted-foreground">
                <th className="px-4 py-[11px] font-semibold">Timezone</th>
                <th className="px-4 py-[11px] font-semibold">State</th>
                <th className="px-4 py-[11px] font-semibold">City</th>
                <th className="px-4 py-[11px] text-right font-semibold">Monthly Target</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {targets.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3"><span className="rounded-full bg-[#e7eed8] px-2 py-0.5 text-[11px] font-semibold text-[#42512f]">{t.timezone}</span></td>
                  <td className="px-4 py-3">{t.state}</td>
                  <td className="px-4 py-3 font-semibold">{t.city}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{t.monthlyTarget.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
