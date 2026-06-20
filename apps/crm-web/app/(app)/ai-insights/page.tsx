'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles, MapPin, Clock, TrendingUp } from 'lucide-react';
import { aiApi } from '@/lib/crm';

export default function AiInsightsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: aiApi.insights,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Analyzing lead data…</p>;

  const best = data?.bestStateToday;
  const tz = data?.bestTimezone;
  const pred = data?.targetPrediction;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Data-driven recommendations computed from your live lead &amp; conversion data (AI-001..003)
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <MapPin className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Best State to Work Today</h3>
          </div>
          {best ? (
            <>
              <p className="text-2xl font-semibold">{best.state}</p>
              <p className="text-sm text-muted-foreground">
                {best.timezone} · {best.conversionPct}% conversion · {best.total} leads
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not enough data yet.</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Clock className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Best Converting Timezone</h3>
          </div>
          {tz ? (
            <>
              <p className="text-2xl font-semibold">{tz.timezone}</p>
              <p className="text-sm text-muted-foreground">
                {tz.conversionPct}% conversion · {tz.total} leads
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not enough data yet.</p>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <TrendingUp className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Target Progress</h3>
          </div>
          <p className="text-2xl font-semibold">{pred?.overallProgressPct ?? 0}%</p>
          <p className="text-sm text-muted-foreground">
            {(pred?.totalLeads ?? 0).toLocaleString()} / {(pred?.plannedLeads ?? 0).toLocaleString()} leads
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border bg-primary/5 p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm">{pred?.note}</p>
      </div>
    </div>
  );
}
