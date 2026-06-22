import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CalendarEvent {
  day: number; // day-of-month
  date: string; // ISO date
  type: 'call' | 'fu' | 'task';
  label: string;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /** Events for a month: call activity (per day), follow-up notes, task due dates. */
  async events(year: number, month: number, userId: string): Promise<CalendarEvent[]> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const dayOf = (d: Date) => d.getUTCDate();

    const [calls, notes, tasks] = await Promise.all([
      this.prisma.call.findMany({
        where: { startTime: { gte: start, lt: end } },
        select: { startTime: true },
      }),
      this.prisma.note.findMany({
        where: { nextFollowupDate: { gte: start, lt: end } },
        select: { nextFollowupDate: true, lead: { select: { businessName: true } } },
      }),
      this.prisma.task.findMany({
        where: { ownerId: userId, dueDate: { gte: start, lt: end } },
        select: { dueDate: true, title: true },
      }),
    ]);

    const events: CalendarEvent[] = [];

    // calls → one aggregated event per day
    const callsByDay = new Map<number, number>();
    for (const c of calls) callsByDay.set(dayOf(c.startTime), (callsByDay.get(dayOf(c.startTime)) ?? 0) + 1);
    for (const [day, count] of callsByDay) {
      events.push({ day, date: new Date(Date.UTC(year, month - 1, day)).toISOString(), type: 'call', label: `${count} call${count === 1 ? '' : 's'}` });
    }

    for (const n of notes) {
      if (!n.nextFollowupDate) continue;
      events.push({
        day: dayOf(n.nextFollowupDate),
        date: n.nextFollowupDate.toISOString(),
        type: 'fu',
        label: `Follow-up: ${n.lead?.businessName ?? 'lead'}`,
      });
    }

    for (const t of tasks) {
      if (!t.dueDate) continue;
      events.push({ day: dayOf(t.dueDate), date: t.dueDate.toISOString(), type: 'task', label: t.title });
    }

    return events.sort((a, b) => a.day - b.day);
  }
}
