'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { metricsApi, type StateMetric } from '@/lib/crm';

const BAR_COLORS = ['#2563eb', '#f59e0b', '#9ca3af'];
const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-64">{children}</div>
    </section>
  );
}

// Color a state tile by progress vs target (MAP-002).
function stateColor(p: number): string {
  if (p >= 100) return 'bg-green-500';
  if (p >= 50) return 'bg-green-400';
  if (p >= 20) return 'bg-amber-400';
  if (p > 0) return 'bg-orange-400';
  return 'bg-red-400';
}

export default function AnalyticsPage() {
  const { data: bar = [] } = useQuery({ queryKey: ['m-bar'], queryFn: metricsApi.bar });
  const { data: tz = [] } = useQuery({ queryKey: ['m-tz'], queryFn: metricsApi.byTimezone });
  const { data: daily = [] } = useQuery({ queryKey: ['m-daily'], queryFn: metricsApi.daily });
  const { data: states = [] } = useQuery({ queryKey: ['m-states'], queryFn: metricsApi.byState });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Lead Metrics (CHT-001)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bar}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {bar.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Leads by Timezone (CHT-002)">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={tz} dataKey="count" nameKey="timezone" outerRadius={90} label>
                {tz.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Daily Lead Progress (CHT-003)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* State map stand-in: color-coded by progress (MAP-002/003).
          A geographic Google Maps/Mapbox tile layer needs an API key (ARCH-009/010). */}
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">State Coverage</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> behind</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> in progress</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> on track</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {states.map((s: StateMetric) => (
            <div
              key={s.state}
              title={`${s.state} — total ${s.total}, planned ${s.planned}, balance ${s.balance}, progress ${s.progressPct}%`}
              className="rounded-md border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-medium">{s.state}</span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stateColor(s.progressPct)}`} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.total} / {s.planned || '—'} · {s.progressPct}%
              </p>
            </div>
          ))}
          {states.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No state data.</p>
          )}
        </div>
      </section>
    </div>
  );
}
