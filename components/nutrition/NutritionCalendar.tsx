'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { WEEKDAYS, addDaysISO, monthGridISO, startOfWeekISO } from '@/domain/workouts/calendar';
import { dayAdherence, type DayAdherence } from '@/domain/nutrition/adherence';
import type { NutritionDayTotals } from '@/lib/db/queries/student-nutrition';
import { Button, Card, CardBody } from '@/components/common';
import { MacroLine, MacroLegend } from '@/components/nutrition/MacroLine';
import { cn } from '@/lib/utils/cn';

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const STATUS_LABEL: Record<DayAdherence, string> = {
  cumplido: 'En meta',
  cerca: 'Cerca',
  lejos: 'Lejos',
  sin_meta: 'Sin meta',
  sin_registro: 'Sin registro',
};

/** Clases de la celda según adherencia. */
function cellAccent(st: DayAdherence): string {
  switch (st) {
    case 'cumplido':
      return 'border-success/40 bg-success/15 text-success';
    case 'cerca':
      return 'border-warning/40 bg-warning/15 text-warning';
    case 'lejos':
      return 'border-danger/40 bg-danger/15 text-danger';
    case 'sin_meta':
      return 'border-border bg-canvas text-muted';
    case 'sin_registro':
    default:
      return 'border-dashed border-border bg-transparent text-faint';
  }
}

export function NutritionCalendar({
  byDate,
  target,
  todayISO,
}: {
  byDate: Record<string, NutritionDayTotals>;
  target: { calories: number | null };
  todayISO: string;
}) {
  const [view, setView] = React.useState<'week' | 'month'>('week');
  const [weekStart, setWeekStart] = React.useState(() => startOfWeekISO(todayISO));
  const [month, setMonth] = React.useState(() => {
    const [y, m] = todayISO.split('-').map(Number);
    return { year: y ?? 1970, month: m ?? 1 };
  });
  const [selected, setSelected] = React.useState<string | null>(null);

  let monthGrid: string[][] = [];
  if (view === 'month') {
    monthGrid = monthGridISO(month.year, month.month);
  }

  function statusOf(dateISO: string): DayAdherence {
    const t = byDate[dateISO];
    return dayAdherence(t?.consumed.calories ?? 0, target.calories, !!t?.hasLogs);
  }

  function prev() {
    if (view === 'week') {
      setWeekStart((w) => addDaysISO(w, -7));
    } else {
      setMonth((m) => (m.month === 1 ? { year: m.year - 1, month: 12 } : { ...m, month: m.month - 1 }));
    }
    setSelected(null);
  }

  function next() {
    if (view === 'week') {
      setWeekStart((w) => addDaysISO(w, 7));
    } else {
      setMonth((m) => (m.month === 12 ? { year: m.year + 1, month: 1 } : { ...m, month: m.month + 1 }));
    }
    setSelected(null);
  }

  const rangeLabel =
    view === 'week'
      ? `${formatHuman(weekStart)} – ${formatHuman(addDaysISO(weekStart, 6))}`
      : `${MONTHS[month.month - 1]} ${month.year}`;

  const selectedTotals = selected ? byDate[selected] : undefined;
  const selectedStatus = selected ? statusOf(selected) : null;

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
          <span className="min-w-40 text-center text-sm font-medium capitalize text-foreground">
            {rangeLabel}
          </span>
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
              status={statusOf(dateISO)}
              todayISO={todayISO}
              selected={selected === dateISO}
              showWeekdayLabel
              onSelect={setSelected}
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
                  status={statusOf(dateISO)}
                  todayISO={todayISO}
                  selected={selected === dateISO}
                  compact
                  dimOtherMonth={Number(dateISO.slice(5, 7)) !== month.month}
                  onSelect={setSelected}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Card>
          <CardBody className="space-y-3 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-faint">{formatHuman(selected)}</p>
                <h4 className="text-base font-semibold text-foreground">
                  {selectedStatus ? STATUS_LABEL[selectedStatus] : ''}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-muted hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            {selectedTotals?.hasLogs ? (
              <div className="space-y-2 text-sm">
                <p className="tabular text-foreground">
                  {selectedTotals.consumed.calories} kcal
                  {target.calories != null && target.calories > 0 && (
                    <span className="text-muted"> / {target.calories} kcal meta</span>
                  )}
                </p>
                <MacroLine macros={selectedTotals.consumed} unit="g" className="text-xs" />
                <MacroLegend className="pt-1" />
              </div>
            ) : (
              <p className="text-sm text-muted">Sin registros este día.</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

interface DayCellProps {
  dateISO: string;
  status: DayAdherence;
  todayISO: string;
  selected: boolean;
  showWeekdayLabel?: boolean;
  compact?: boolean;
  dimOtherMonth?: boolean;
  onSelect: (dateISO: string) => void;
}

function DayCell({
  dateISO,
  status,
  todayISO,
  selected,
  showWeekdayLabel,
  compact,
  dimOtherMonth,
  onSelect,
}: DayCellProps) {
  const isToday = dateISO === todayISO;
  const dayNum = Number(dateISO.slice(8, 10));

  return (
    <button
      type="button"
      onClick={() => onSelect(dateISO)}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg border p-2 text-left transition-colors',
        compact ? 'min-h-16' : 'min-h-24',
        cellAccent(status),
        selected && 'ring-2 ring-primary',
        isToday && !selected && 'ring-1 ring-primary/50',
        dimOtherMonth && 'opacity-30',
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-faint')}>
          {showWeekdayLabel ? `${weekdayShort(dateISO)} ${dayNum}` : dayNum}
        </span>
      </div>
      <span className="text-xs font-medium leading-tight">{STATUS_LABEL[status]}</span>
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
