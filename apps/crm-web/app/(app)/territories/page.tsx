'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { metricsApi, type StateMetric } from '@/lib/crm';
import { PageHead } from '@/components/page-head';

// Recognizable US grid layout — each state positioned as a cell.
const US_GRID: string[][] = [
  ['', '', '', '', '', '', '', '', '', '', 'ME'],
  ['', '', '', '', '', '', '', '', '', 'VT', 'NH'],
  ['WA', 'ID', 'MT', 'ND', 'MN', 'IL', 'WI', 'MI', 'NY', 'MA', ''],
  ['OR', 'NV', 'WY', 'SD', 'IA', 'IN', 'OH', 'PA', 'NJ', 'CT', 'RI'],
  ['CA', 'UT', 'CO', 'NE', 'MO', 'KY', 'WV', 'VA', 'MD', 'DE', ''],
  ['', 'AZ', 'NM', 'KS', 'AR', 'TN', 'NC', 'SC', 'DC', '', ''],
  ['', '', '', 'OK', 'LA', 'MS', 'AL', 'GA', '', '', ''],
  ['', '', '', 'TX', '', '', '', 'FL', '', '', 'AK'],
  ['HI', '', '', '', '', '', '', '', '', '', ''],
];

const AB_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const CW = 42, CH = 34, GAP = 4, PAD = 6;
const W = PAD * 2 + 11 * (CW + GAP);
const H = PAD * 2 + 9 * (CH + GAP);

function fillFor(m?: StateMetric): { rect: string; text: string } {
  if (!m || m.total === 0) return { rect: '#ffffff', text: '#42512f' };
  if (m.total >= 60) return { rect: '#556b34', text: '#ffffff' };
  if (m.total >= 25) return { rect: '#94ab68', text: '#1c2316' };
  return { rect: '#e3ead9', text: '#42512f' };
}

export default function TerritoriesPage() {
  const { data: states = [] } = useQuery({ queryKey: ['m-states'], queryFn: metricsApi.byState });
  const byName = new Map(states.map((s) => [s.state, s]));
  const [hover, setHover] = useState<{ m: StateMetric; ab: string; x: number; y: number } | null>(null);

  const cells: React.ReactNode[] = [];
  US_GRID.forEach((row, r) => {
    row.forEach((ab, c) => {
      if (!ab) return;
      const x = PAD + c * (CW + GAP);
      const y = PAD + r * (CH + GAP);
      const m = byName.get(AB_TO_NAME[ab]);
      const { rect, text } = fillFor(m);
      cells.push(
        <g
          key={ab}
          transform={`translate(${x},${y})`}
          className="cursor-pointer"
          onMouseEnter={() => m && setHover({ m, ab, x: x + CW / 2, y })}
          onMouseLeave={() => setHover(null)}
        >
          <rect width={CW} height={CH} rx={5} fill={rect} stroke="#ccd3ba" strokeWidth={1} className="transition-[fill]" />
          <text x={CW / 2} y={CH / 2 + 4} textAnchor="middle" fontSize={11} fontWeight={600} fontFamily="var(--font-mono)" fill={text}>
            {ab}
          </text>
        </g>,
      );
    });
  });

  return (
    <div>
      <PageHead lead="State-level coverage across territories. Hover a state to see leads, balance, and progress." />

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-[18px] py-4">
          <div><h3 className="font-display text-[15px] font-semibold">Territory Map</h3><div className="text-xs text-muted-foreground">{states.length} states with leads · {states.reduce((a, s) => a + s.total, 0).toLocaleString()} total</div></div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-white ring-1 ring-[#ccd3ba]" /> none</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-[#e3ead9]" /> low</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-[#94ab68]" /> medium</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-[#556b34]" /> high</span>
          </div>
        </div>
        <div className="relative p-[18px]">
          <div className="overflow-hidden rounded-[16px] border bg-[#f4f7ec] p-2">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="block h-auto w-full">
              {cells}
            </svg>
          </div>
          {hover && (
            <div
              className="pointer-events-none absolute z-10 min-w-[160px] rounded-[10px] bg-[#11140d] px-3 py-2.5 text-[12px] text-white shadow-lg"
              style={{ left: `calc(${(hover.x / W) * 100}% )`, top: `calc(${(hover.y / H) * 100}% + 4px)`, transform: 'translate(-50%, 8px)' }}
            >
              <div className="mb-1.5 font-display text-[13px] font-bold">{hover.m.state} ({hover.ab})</div>
              {[['Total Leads', hover.m.total.toLocaleString()], ['Planned', hover.m.planned.toLocaleString()], ['Balance', hover.m.balance.toLocaleString()], ['Progress', `${hover.m.progressPct}%`]].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-4 py-px"><span className="text-[#94ab68]">{l}</span><span className="font-mono">{v}</span></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
