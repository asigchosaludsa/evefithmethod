# Training calendar / agenda + weekday scheduling + adherence

> Approved in brainstorming 2026-06-22. Single-coach. Decisions: calendar is
> COMPUTED (not materialized); plans run a fixed number of weeks then end and
> prompt reassignment; per-day "check simple + drill-in detail"; plus a
> "Hoy te toca" block on the student Today screen. (Deferred for now: adherence
> %/streak, auto-missed alerts, move-day/notes.)

## Goal
The coach assigns a workout plan, picks the split, maps each split day to a
weekday (Empuje=Lunes, Jalón=Miércoles, Pierna=Viernes; rest = unmapped days),
sets a start date and a duration in weeks. The app lays this out on a calendar.
Coach (per selected student) and student both see weekly + monthly views and can
mark each planned day Completado / No hecho. Tapping a day shows/edits the
exercise+set detail (reuses the existing workout-log flow). The coach can
reassign / change the split in-course.

## Data model (migration 0013, additive)
- `workout_plan_days.weekday` smallint NULL, CHECK 1..7 (1=Mon .. 7=Sun). Each
  split day is mapped to a weekday; NULL means not scheduled.
- `workout_plans.weeks` smallint NULL, CHECK 1..52. Duration in weeks.
  `starts_at` (existing date) = start date; the active window is
  `[starts_at, starts_at + weeks*7)`. `ends_at` is also set for convenience.
- `workout_logs.session_date` date NULL. The calendar date a session is FOR
  (distinct from `logged_at` = when it was recorded). Partial UNIQUE index on
  `(student_id, workout_plan_day_id, session_date) WHERE session_date IS NOT NULL`
  so each planned slot has one canonical completion row to toggle. Existing
  ad-hoc logs (session_date NULL) are unaffected.

RLS: no new tables. Reuse existing workout_logs policies (student writes own;
coach writes for own students via coach_has_student). weekday/weeks live on
plan tables already coach-scoped.

## Domain (pure, tested) — `domain/workouts/calendar.ts`
- `WEEKDAYS` (1..7 with Spanish labels). `weekdayOf(dateISO)`, `startOfWeekISO`
  (Monday), `addDaysISO`, `monthGridISO(year, month)` (weeks x 7 dates).
- `planActiveWindow(starts_at, weeks)` -> { start, endExclusive }.
- `buildCalendar(planDays, startsAt, weeks, rangeStart, rangeEnd)` ->
  `CalendarDay[]` where each day is `{ dateISO, inWindow, planDay | null }`
  (planDay = the split day whose weekday matches that date and the date is within
  the active window; null = rest or out-of-window).
- `planHasEnded(starts_at, weeks, todayISO)` -> boolean (for the "ended, reassign"
  prompt). All pure; full Vitest coverage (TDD), including week-boundary and
  month-grid edge cases.

## Server actions
- Plan create/edit (`lib/coach/actions.ts`): persist `weekday` per day, `weeks`,
  and `starts_at`/`ends_at` on the plan. The split builder lets the coach assign
  a weekday to each generated day (default sensible spread; editable).
- `toggleSessionStatus({ planId, planDayId, dateISO, status })` (new, in
  `lib/workouts/session-actions.ts`): upsert a workout_log keyed by
  (student_id, workout_plan_day_id, session_date=dateISO) with
  status in ('completed','skipped'); toggling back clears to no-row or 'started'.
  Authorized for the student (own) and the coach (assertCoachOwnsStudent). Used by
  the calendar checkboxes.
- Reassign: reuse existing archiveWorkoutPlan + createWorkoutPlan. A plan whose
  window has ended shows an "assign next block" prompt on the coach view.

## UI
- **Coach**: new "Calendario" view on the student detail (e.g.
  `coach/students/[studentId]/calendar` or a tab on the workouts page). Week +
  month toggle. Each day cell shows the split-day focus + a status dot
  (planned / completed / skipped / rest / today). Click a day -> panel with the
  day's exercises and the set detail (reuse the guided-log read), plus
  Completado / No hecho buttons (toggleSessionStatus). Student picker is the
  existing student selection.
- **Student**: workout view (`student/workout`) gains week + month calendar with
  the same per-day check. "Hoy te toca: {focus}" card on `student/today` driven
  by the active plan's calendar for today (rest day -> "Descanso").
- **Plan builder**: when creating/editing a workout plan, after choosing the
  split, a compact weekday picker per generated day + a "semanas" field + start
  date. Reuses the existing split + catalog flow.

## Build order
1. Migration 0013 + types.
2. domain/workouts/calendar.ts + tests (TDD).
3. Plan create/edit: weekday + weeks + start date persisted.
4. session-actions toggleSessionStatus.
5. Coach calendar view (week/month + day detail + check).
6. Student calendar view + "Hoy te toca".

## Out of scope (later)
Adherence %/streak, auto-missed + alerts, drag/move a session, per-day notes,
multi-coach.
