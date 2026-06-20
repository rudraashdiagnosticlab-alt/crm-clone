import { Injectable } from '@nestjs/common';
import { Prisma, Timezone } from '@crm/database';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsQueryDto } from './dto/metrics.dto';

interface Node {
  total: number;
  planned: number;
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Build the leads WHERE clause from the dashboard filter (FLT-008). */
  private leadWhere(q: MetricsQueryDto): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    if (q.timezone) where.timezone = q.timezone;
    if (q.state) where.state = q.state;
    if (q.city) where.city = q.city;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    return where;
  }

  private targetWhere(q: MetricsQueryDto): Prisma.TargetWhereInput {
    const where: Prisma.TargetWhereInput = {};
    if (q.timezone) where.timezone = q.timezone;
    if (q.state) where.state = q.state;
    if (q.city) where.city = q.city;
    return where;
  }

  /** DSH-001..004 / MET — KPI summary for the active filter. */
  async summary(q: MetricsQueryDto) {
    const [totalLeads, plannedAgg, closed] = await Promise.all([
      this.prisma.lead.count({ where: this.leadWhere(q) }),
      this.prisma.target.aggregate({ where: this.targetWhere(q), _sum: { monthlyTarget: true } }),
      this.prisma.lead.count({ where: { ...this.leadWhere(q), status: 'closed' } }),
    ]);
    const plannedLeads = plannedAgg._sum.monthlyTarget ?? 0;
    const balanceLeads = Math.max(plannedLeads - totalLeads, 0);
    const progressPct = plannedLeads > 0 ? Number(((totalLeads / plannedLeads) * 100).toFixed(2)) : 0;
    return { totalLeads, plannedLeads, balanceLeads, progressPct, closedLeads: closed };
  }

  /** CHT-002 — leads split by timezone (pie). */
  async byTimezone(q: MetricsQueryDto) {
    const grouped = await this.prisma.lead.groupBy({
      by: ['timezone'],
      where: this.leadWhere(q),
      _count: { _all: true },
    });
    const all: Timezone[] = ['EST', 'CST', 'MST', 'PST'];
    return all.map((tz) => ({
      timezone: tz,
      count: grouped.find((g) => g.timezone === tz)?._count._all ?? 0,
    }));
  }

  /** MAP-002/003 — per-state totals vs targets (color-coded state map). */
  async byState(q: MetricsQueryDto) {
    const [leadGroups, targetGroups] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['state', 'timezone'],
        where: this.leadWhere(q),
        _count: { _all: true },
      }),
      this.prisma.target.groupBy({
        by: ['state'],
        where: this.targetWhere(q),
        _sum: { monthlyTarget: true },
      }),
    ]);
    const plannedByState = new Map(targetGroups.map((t) => [t.state, t._sum.monthlyTarget ?? 0]));
    const totalByState = new Map<string, { total: number; timezone: string }>();
    for (const g of leadGroups) {
      const cur = totalByState.get(g.state) ?? { total: 0, timezone: g.timezone };
      cur.total += g._count._all;
      totalByState.set(g.state, cur);
    }
    return [...totalByState.entries()]
      .map(([state, v]) => {
        const planned = plannedByState.get(state) ?? 0;
        const progressPct = planned > 0 ? Number(((v.total / planned) * 100).toFixed(1)) : 0;
        return {
          state,
          timezone: v.timezone,
          total: v.total,
          planned,
          balance: Math.max(planned - v.total, 0),
          progressPct,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  /** CHT-003 — daily lead counts over the selected range (line). */
  async daily(q: MetricsQueryDto) {
    const leads = await this.prisma.lead.findMany({
      where: this.leadWhere(q),
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const byDay = new Map<string, number>();
    for (const l of leads) {
      const day = l.createdAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return [...byDay.entries()].map(([date, count]) => ({ date, count }));
  }

  /** CHT-001 — bar chart: total / planned / balance. */
  async bar(q: MetricsQueryDto) {
    const s = await this.summary(q);
    return [
      { name: 'Total', value: s.totalLeads },
      { name: 'Planned', value: s.plannedLeads },
      { name: 'Balance', value: s.balanceLeads },
    ];
  }

  /** PVT-001/002 — Timezone › State › City pivot tree with per-level metrics. */
  async pivot(q: MetricsQueryDto) {
    const [leadGroups, targetGroups] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['timezone', 'state', 'city'],
        where: this.leadWhere(q),
        _count: { _all: true },
      }),
      this.prisma.target.groupBy({
        by: ['timezone', 'state', 'city'],
        where: this.targetWhere(q),
        _sum: { monthlyTarget: true },
      }),
    ]);

    // tz -> state -> city -> Node
    const tree = new Map<string, Map<string, Map<string, Node>>>();
    const ensure = (tz: string, st: string, ci: string): Node => {
      if (!tree.has(tz)) tree.set(tz, new Map());
      const states = tree.get(tz)!;
      if (!states.has(st)) states.set(st, new Map());
      const cities = states.get(st)!;
      if (!cities.has(ci)) cities.set(ci, { total: 0, planned: 0 });
      return cities.get(ci)!;
    };
    for (const g of leadGroups) ensure(g.timezone, g.state, g.city).total += g._count._all;
    for (const g of targetGroups)
      ensure(g.timezone, g.state, g.city).planned += g._sum.monthlyTarget ?? 0;

    const node = (total: number, planned: number) => ({
      total,
      planned,
      balance: Math.max(planned - total, 0),
      progressPct: planned > 0 ? Number(((total / planned) * 100).toFixed(2)) : 0,
    });

    return [...tree.entries()].map(([timezone, states]) => {
      const stateRows = [...states.entries()].map(([state, cities]) => {
        const cityRows = [...cities.entries()].map(([city, n]) => ({
          city,
          ...node(n.total, n.planned),
        }));
        const sTotal = cityRows.reduce((a, c) => a + c.total, 0);
        const sPlanned = cityRows.reduce((a, c) => a + c.planned, 0);
        return { state, ...node(sTotal, sPlanned), cities: cityRows };
      });
      const tTotal = stateRows.reduce((a, s) => a + s.total, 0);
      const tPlanned = stateRows.reduce((a, s) => a + s.planned, 0);
      return { timezone, ...node(tTotal, tPlanned), states: stateRows };
    });
  }
}
