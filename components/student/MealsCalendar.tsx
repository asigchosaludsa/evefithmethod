'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WEEKDAYS, addDaysISO, monthGridISO, startOfWeekISO } from '@/domain/workouts/calendar';
import type { NutritionDayTotals } from '@/lib/db/queries/student-nutrition';
import { Button } from '@/components/common';
import { cn } from '@/lib/utils/cn';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Calendario de comidas. A diferencia de NutritionCalendar, la selección de día
 * se refleja en la URL (`?date=YYYY-MM-DD`) para que el detalle se renderice en
 * el servidor. Marca con kcal los días que tienen registros.
 */
export function MealsCalendar({
  byDate,
  selectedISO,
  todayISO,
}: {
  byDate: Record<string, NutritionDayTotals>;
  selectedISO: string;
  todayISO: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = React.useState<'week' | 'month'>('week');
  const [weekStart, setWeekStart] = React.useState(() => startOfWeekISO(selectedISO));
  const [month, setMonth] = React.useState(() => {
    const [y, m] = selectedISO.split('-').map(Number);
    return { year: y ?? 1970, month: m ?? 1 };
  });

  function selectDate(dateISO: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', dateISO);
    router.push(`/student/meals?${params.toString()}`, { scroll: false });
  }

  function prev() {
    if (view === 'week') setWeekStart((w) => addDaysISO(w, -7));
    else setMonth((m) => (m.month === 1 ? { year: m.year - 1, month: 12 } : { ...m, month: m.month - 1 }));
  }

  function next() {
    if (view === 'week') setWeekStart((w) => addDaysISO(w, 7));
    else setMonth((m) => (m.month === 12 ? { year: m.year + 1, month: 1 } : { ...m, month: m.month + 1 }));
  }

  const rangeLabel =
    view === 'week'
      ? `${formatHuman(weekStart)} – ${formatHuman(addDaysISO(weekStart, 6))}`
      : `${MONTHS[month.month - 1]} ${month.year}`;

  const monthGrid = view === 'month' ? monthGridISO(month.year, month.month) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-border bg-elevated p-0.5">
          <button
            type="button"
            onClick={() => setView('week')}
            className={cn(
              'rounded px-3 py-1 text-sm font-medium transition-colors',
              view === 'week' ? 'bg-primary text-on-primary' : 'text-muted hover:text-foreground',
            )}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={cn(
              'rounded px-3 py-1 text-sm font-medium transition-colors',
              view === 'month' ? 'bg-primary text-on-primary' : 'text-muted hover:text-foreground',
            )}
          >
            Mes
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={prev} aria-label="Anterior">
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium capitalize text-foreground">{rangeLabel}</span>
          <Button variant="ghost" size="sm" onClick={next} aria-label="Siguiente">
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {view === 'week' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)).map((dateISO) => (
            <DayCell
              key={dateISO}
              dateISO={dateISO}
              totals={byDate[dateISO]}
              todayISO={todayISO}
              selected={selectedISO === dateISO}
              showWeekdayLabel
              onSelect={selectDate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-faint">
            {WEEKDAYS.map((w) => (
              <span key={w.value}>{w.short}</span>
            ))}
          </div>
          {monthGrid.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-2">
              {row.map((dateISO) => (
                <DayCell
                  key={dateISO}
                  dateISO={dateISO}
                  totals={byDate[dateISO]}
                  todayISO={todayISO}
                  selected={selectedISO === dateISO}
                  compact
                  dimOtherMonth={Number(dateISO.slice(5, 7)) !== month.month}
                  onSelect={selectDate}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DayCellProps {
  dateISO: string;
  totals: NutritionDayTotals | undefined;
  todayISO: string;
  selected: boolean;
  showWeekdayLabel?: boolean;
  compact?: boolean;
  dimOtherMonth?: boolean;
  onSelect: (dateISO: string) => void;
}

function DayCell({
  dateISO,
  totals,
  todayISO,
  selected,
  showWeekdayLabel,
  compact,
  dimOtherMonth,
  onSelect,
}: DayCellProps) {
  const isToday = dateISO === todayISO;
  const dayNum = Number(dateISO.slice(8, 10));
  const hasLogs = !!totals?.hasLogs;

  return (
    <button
      type="button"
      onClick={() => onSelect(dateISO)}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg border p-2 text-left transition-colors',
        compact ? 'min-h-16' : 'min-h-24',
        hasLogs ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-border bg-canvas text-muted',
        selected && 'ring-2 ring-primary',
        isToday && !selected && 'ring-1 ring-primary/50',
        dimOtherMonth && 'opacity-30',
      )}
    >
      <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-faint')}>
        {showWeekdayLabel ? `${weekdayShort(dateISO)} ${dayNum}` : dayNum}
      </span>
      {hasLogs ? (
        <span className="tabular text-xs font-medium leading-tight">{totals?.consumed.calories} kcal</span>
      ) : (
        <span className="text-xs leading-tight text-faint">—</span>
      )}
    </button>
  );
}

function weekdayShort(dateISO: string): string {
  const parts = dateISO.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1));
  const dow = d.getUTCDay();
  const idx = dow === 0 ? 6 : dow - 1;
  return WEEKDAYS[idx]?.short ?? '';
}

function formatHuman(dateISO: string): string {
  const parts = dateISO.split('-').map(Number);
  const day = parts[2] ?? 1;
  const monthName = MONTHS[(parts[1] ?? 1) - 1] ?? '';
  return `${day} ${monthName}`;
}
