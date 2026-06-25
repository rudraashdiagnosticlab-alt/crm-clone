'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { DateRange } from '@/lib/date-filters';

// ── date helpers (local-time, no UTC drift) ──
const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const fmt = (s: string) => parseISO(s).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
const fmtShort = (s: string) => parseISO(s).toLocaleDateString([], { month: 'short', day: 'numeric' });
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Hook: close when clicking/escaping outside the popover. */
function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
}

const triggerCls =
  'flex items-center gap-[7px] rounded-md border bg-card px-3 py-2 text-[13px] font-medium text-[#27301d] outline-none transition-colors hover:bg-muted/40 dark:text-foreground';
const popoverCls = 'absolute right-0 z-50 mt-2 w-[280px] rounded-xl border bg-card p-3 shadow-lg';

/** Month grid. `selected(day)` and `inRange(day)` drive styling; `onPick` fires the chosen day. */
function MonthGrid({
  view,
  setView,
  onPick,
  isSelected,
  isInRange,
  isToday,
}: {
  view: Date;
  setView: (d: Date) => void;
  onPick: (d: Date) => void;
  isSelected: (d: Date) => boolean;
  isInRange: (d: Date) => boolean;
  isToday: (d: Date) => boolean;
}) {
  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const startDow = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(new Date(year, month, d));
    return out;
  }, [view]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted" aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-[13px] font-semibold">{view.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
        <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase text-muted-foreground">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) =>
          d === null ? (
            <div key={`e${i}`} />
          ) : (
            <button
              key={toISO(d)}
              type="button"
              onClick={() => onPick(d)}
              className={[
                'grid h-8 place-items-center rounded-md text-[12.5px] transition-colors',
                isSelected(d)
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : isInRange(d)
                    ? 'bg-primary/15 text-foreground'
                    : 'hover:bg-muted',
                isToday(d) && !isSelected(d) ? 'font-bold text-primary ring-1 ring-primary/40' : '',
              ].join(' ')}
            >
              {d.getDate()}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Range calendar picker (req 8) — one click on the trigger opens the calendar.
 * Supports preset shortcuts plus explicit from/to day selection. Value is
 * `{ from, to }` as yyyy-mm-dd strings ('' = unbounded).
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Date range',
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const [view, setView] = useState(() => (value.from ? parseISO(value.from) : new Date()));

  const label = value.from && value.to
    ? value.from === value.to ? fmt(value.from) : `${fmtShort(value.from)} – ${fmtShort(value.to)}`
    : value.from ? `From ${fmtShort(value.from)}`
    : value.to ? `Until ${fmtShort(value.to)}`
    : placeholder;
  const active = !!(value.from || value.to);

  function pick(d: Date) {
    const iso = toISO(d);
    // No range yet, or a full range exists → start a new range.
    if (!value.from || (value.from && value.to)) {
      onChange({ from: iso, to: '' });
    } else {
      // Second click completes the range (swap if earlier than the start).
      if (iso < value.from) onChange({ from: iso, to: value.from });
      else { onChange({ from: value.from, to: iso }); setOpen(false); }
    }
  }

  function preset(from: Date, to: Date) {
    onChange({ from: toISO(from), to: toISO(to) });
    setView(from);
    setOpen(false);
  }

  const today = startOfToday();
  const PRESETS: [string, () => void][] = [
    ['Today', () => preset(today, today)],
    ['Yesterday', () => preset(addDays(today, -1), addDays(today, -1))],
    ['Last 7 days', () => preset(addDays(today, -6), today)],
    ['Last 30 days', () => preset(addDays(today, -29), today)],
    ['This month', () => preset(new Date(today.getFullYear(), today.getMonth(), 1), today)],
  ];

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerCls} aria-haspopup="dialog" aria-expanded={open}>
        <CalendarRange className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={active ? '' : 'text-muted-foreground'}>{label}</span>
        {active && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange({ from: '', to: '' }); }}
            className="ml-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear dates"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className={popoverCls} role="dialog">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {PRESETS.map(([lbl, fn]) => (
              <button key={lbl} type="button" onClick={fn} className="rounded-full border px-2.5 py-1 text-[11.5px] font-medium hover:bg-muted">
                {lbl}
              </button>
            ))}
          </div>
          <MonthGrid
            view={view}
            setView={setView}
            onPick={pick}
            isSelected={(d) => { const i = toISO(d); return i === value.from || i === value.to; }}
            isInRange={(d) => !!(value.from && value.to && toISO(d) > value.from && toISO(d) < value.to)}
            isToday={(d) => toISO(d) === toISO(today)}
          />
          <div className="mt-2 flex items-center justify-between border-t pt-2 text-[12px]">
            <span className="text-muted-foreground">
              {value.from ? (value.to ? `${fmtShort(value.from)} – ${fmtShort(value.to)}` : `${fmtShort(value.from)} – …`) : 'Pick a start date'}
            </span>
            <button type="button" onClick={() => setOpen(false)} className="font-semibold text-primary hover:underline">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Single-date calendar picker (req 8). Value is a yyyy-mm-dd string ('' = unset).
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const [view, setView] = useState(() => (value ? parseISO(value) : new Date()));
  const today = startOfToday();

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerCls} aria-haspopup="dialog" aria-expanded={open}>
        <CalendarRange className={`h-3.5 w-3.5 ${value ? 'text-primary' : 'text-muted-foreground'}`} />
        <span className={value ? '' : 'text-muted-foreground'}>{value ? fmt(value) : placeholder}</span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="ml-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear date"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className={popoverCls} role="dialog">
          <MonthGrid
            view={view}
            setView={setView}
            onPick={(d) => { onChange(toISO(d)); setOpen(false); }}
            isSelected={(d) => toISO(d) === value}
            isInRange={() => false}
            isToday={(d) => toISO(d) === toISO(today)}
          />
        </div>
      )}
    </div>
  );
}
