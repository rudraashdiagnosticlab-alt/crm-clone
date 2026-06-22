'use client';

import { useId } from 'react';

/** Inline SVG sparkline (area + line) matching the Ranger KPI cards. */
export function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  const id = useId().replace(/:/g, '');
  if (!data || data.length < 2) return <div style={{ height }} />;

  const W = 100;
  const H = height;
  const pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const px = (i: number) => (i / (data.length - 1)) * W;
  const py = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);

  const line = data.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(2)} ${py(v).toFixed(2)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} className="block">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
