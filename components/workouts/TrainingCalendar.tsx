'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Moon,
  X,
} from 'lucide-react';
import {
  WEEKDAYS,
  addDaysISO,
  buildCalendar,
  monthGridISO,
  planHasEnded,
  startOfWeekISO,
  type CalendarDay,
  type PlanDayLite,
} from '@/domain/workouts/calendar';
import { Badge, Button, Card, CardBody, EmptyState } from '@/components/common';
import { toggleSessionStatus } from '@/lib/workouts/session-actions';
import { cn } from '@/lib/utils/cn';

type LogStatus = 'completed' | 'skipped' | 'started';

interface CalendarExercise {
  name: string;
  sets: number;
  reps: string;
  suggested_weight_kg: number | null;
}

export interface TrainingCalendarProps {
  studentId: string;
  plan: { id: string; title: string; split_type: string | null; starts_at: string | null; weeks: number | null } | null;
  days: PlanDayLite[];
  exercisesByDay: Record<string, CalendarExercise[]>;
  statusByKey: Record<string, LogStatus>;
  canEdit: boolean;
  todayISO: string;
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function keyOf(planDayId: string, dateISO: string): string {
  return `${planDayId}|${dateISO}`;
}

export function TrainingCalendar({
  studentId,
  plan,
  days,
  exercisesByDay,
  statusByKey,
  canEdit,
  todayISO,
}: TrainingCalendarProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [view, setView] = React.useState<'week' | 'month'>('week');
  const [weekStart, setWeekStart] = React.useState(() => startOfWeekISO(todayISO));
  const [month, setMonth] = React.useState(() => {
    const [y, m] = todayISO.split('-').map(Number);
    return { year: y ?? 1970, month: m ?? 1 };
  });
  const [selected, setSelected] = React.useState<{ dateISO: string; planDay: PlanDayLite } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  if (!plan) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Sin plan activo"
        description="No hay un plan de entrenamiento activo para mostrar en el calendario."
      />
    );
  }

  const ended = planHasEnded(plan.starts_at, plan.weeks, todayISO);

  // Compute visible range + grid for the chosen view.
  let rangeStart: string;
  let rangeEnd: string;
  let monthGrid: string[][] = [];
  if (view === 'week') {
    rangeStart = weekStart;
    rangeEnd = addDaysISO(weekStart, 6);
  } else {
    monthGrid = monthGridISO(month.year, month.month);
    rangeStart = monthGrid[0]?.[0] ?? todayISO;
    const lastRow = monthGrid[monthGrid.length - 1];
    rangeEnd = lastRow?.[lastRow.length - 1] ?? todayISO;
  }

  const calendar = buildCalendar(days, plan.starts_at, plan.weeks, rangeStart, rangeEnd);
  const byDate = new Map<string, CalendarDay>(calendar.map((c) => [c.dateISO, c]));

  function statusFor(day: CalendarDay): LogStatus | null {
    if (!day.planDay) return null;
    return statusByKey[keyOf(day.planDay.id, day.dateISO)] ?? null;
  }

  function handleSelect(day: CalendarDay) {
    if (!day.planDay) return;
    setError(null);
    setSelected({ dateISO: day.dateISO, planDay: day.planDay });
  }

  function handleToggle(status: 'completed' | 'skipped') {
    if (!selected || !plan) return;
    const current = statusByKey[keyOf(selected.planDay.id, selected.dateISO)] ?? null;
    const next = current === status ? 'clear' : status;
    setError(null);
    startTransition(async () => {
      const res = await toggleSessionStatus({
        studentId,
        planId: plan.id,
        planDayId: selected.planDay.id,
        dateISO: selected.dateISO,
        status: next,
      });
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
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

  const selectedStatus = selected
    ? statusByKey[keyOf(selected.planDay.id, selected.dateISO)] ?? null
    : null;
  const selectedExercises = selected ? exercisesByDay[selected.planDay.id] ?? [] : [];

  return (
    <div className="space-y-4">
      {ended && (
        <div className="rounded-md border border-warning/25 bg-warning/5 px-3 py-2 text-sm text-warning">
          Este bloque terminó.{' '}
          {canEdit && <span className="text-muted">Asigna un nuevo plan para continuar.</span>}
        </div>
      )}

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
          {Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)).map((dateISO) => {
            const day = byDate.get(dateISO);
            if (!day) return null;
            return (
              <DayCell
                key={dateISO}
                day={day}
                status={statusFor(day)}
                todayISO={todayISO}
                selected={selected?.dateISO === dateISO}
                showWeekdayLabel
                onSelect={handleSelect}
              />
            );
          })}
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
              {row.map((dateISO) => {
                const day = byDate.get(dateISO);
                if (!day) return null;
                return (
                  <DayCell
                    key={dateISO}
                    day={day}
                    status={statusFor(day)}
                    todayISO={todayISO}
                    selected={selected?.dateISO === dateISO}
                    compact
                    dimOtherMonth={Number(dateISO.slice(5, 7)) !== month.month}
                    onSelect={handleSelect}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Card>
          <CardBody className="space-y-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-faint">{formatHuman(selected.dateISO)}</p>
                <h4 className="text-base font-semibold text-foreground">
                  {selected.planDay.focus ?? selected.planDay.title}
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

            {selectedExercises.length === 0 ? (
              <p className="text-sm text-muted">Sin ejercicios asignados para este día.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {selectedExercises.map((ex, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-foreground">{ex.name}</span>
                    <span className="tabular text-muted">
                      {ex.sets} × {ex.reps}
                      {ex.suggested_weight_kg != null ? ` · ${ex.suggested_weight_kg} kg` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedStatus === 'completed' ? 'primary' : 'outline'}
                  loading={isPending}
                  onClick={() => handleToggle('completed')}
                >
                  <Check className="size-4" aria-hidden /> Completado
                </Button>
                <Button
                  size="sm"
                  variant={selectedStatus === 'skipped' ? 'secondary' : 'outline'}
                  loading={isPending}
                  onClick={() => handleToggle('skipped')}
                >
                  <X className="size-4" aria-hidden /> No hecho
                </Button>
              </div>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

interface DayCellProps {
  day: CalendarDay;
  status: LogStatus | null;
  todayISO: string;
  selected: boolean;
  showWeekdayLabel?: boolean;
  compact?: boolean;
  dimOtherMonth?: boolean;
  onSelect: (day: CalendarDay) => void;
}

function DayCell({
  day,
  status,
  todayISO,
  selected,
  showWeekdayLabel,
  compact,
  dimOtherMonth,
  onSelect,
}: DayCellProps) {
  const isToday = day.dateISO === todayISO;
  const dayNum = Number(day.dateISO.slice(8, 10));
  const planDay = day.planDay;
  const clickable = !!planDay;

  const accent =
    status === 'completed'
      ? 'border-primary/40 bg-primary/10'
      : status === 'skipped'
        ? 'border-border bg-elevated'
        : planDay
          ? 'border-border bg-surface hover:border-muted/40'
          : 'border-dashed border-border bg-transparent';

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onSelect(day)}
      className={cn(
        'flex w-full flex-col gap-1 rounded-lg border p-2 text-left transition-colors',
        compact ? 'min-h-16' : 'min-h-24',
        accent,
        selected && 'ring-2 ring-primary',
        isToday && !selected && 'ring-1 ring-primary/50',
        !day.inWindow && 'opacity-40',
        dimOtherMonth && 'opacity-30',
        !clickable && 'cursor-default',
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-faint')}>
          {showWeekdayLabel ? `${weekdayShort(day.dateISO)} ${dayNum}` : dayNum}
        </span>
        {status === 'completed' && <Check className="size-3.5 text-primary" aria-hidden />}
      </div>

      {planDay ? (
        <span
          className={cn(
            'text-xs font-medium leading-tight',
            status === 'skipped' ? 'text-muted line-through' : 'text-foreground',
          )}
        >
          <Dumbbell className="mr-1 inline size-3 text-primary" aria-hidden />
          {planDay.focus ?? planDay.title}
        </span>
      ) : (
        day.inWindow && (
          <span className="inline-flex items-center gap-1 text-xs text-faint">
            <Moon className="size-3" aria-hidden /> Descanso
          </span>
        )
      )}

      {status === 'skipped' && (
        <Badge tone="neutral" className="mt-auto w-fit">
          No hecho
        </Badge>
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
