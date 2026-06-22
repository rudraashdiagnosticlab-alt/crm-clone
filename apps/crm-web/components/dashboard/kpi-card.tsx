'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { Sparkline } from './sparkline';

export interface KpiProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: React.ReactNode;
  label: string;
  trend?: string;
  trendDir?: 'up' | 'down';
  spark?: number[];
  sparkColor?: string;
  index?: number;
}

export function KpiCard({ icon: Icon, iconBg, iconColor, value, label, trend, trendDir = 'up', spark, sparkColor, index = 0 }: KpiProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="overflow-hidden rounded-2xl border bg-card p-[17px] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="grid h-[38px] w-[38px] place-items-center rounded-[10px]" style={{ background: iconBg, color: iconColor }}>
          <Icon className="h-[19px] w-[19px]" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-0.5 rounded-full px-2 py-[3px] text-xs font-semibold ${
              trendDir === 'up' ? 'bg-[#eaf2e6] text-[#3f7a32]' : 'bg-[#fbeeec] text-[#9e2b21]'
            }`}
          >
            {trendDir === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className="font-display text-[28px] font-semibold leading-none tracking-tight">{value}</div>
      <div className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">{label}</div>
      {spark && (
        <div className="mt-3 h-8">
          <Sparkline data={spark} color={sparkColor ?? iconColor} />
        </div>
      )}
    </motion.div>
  );
}
