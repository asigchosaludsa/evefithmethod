# Entrenamiento: completado real + progresión — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar el "completado" de entrenamiento en una sola fuente de verdad, mostrar el calendario con ✓/✗ por ejercicio, reemplazar "Hoy te toca" por una celebración (anillo + racha) cuando la sesión ya se hizo, precargar el último peso por ejercicio y graficar el peso máximo, con control total para la coach.

**Architecture:** Una sesión = una fila en `workout_logs` identificada por `(student_id, workout_plan_day_id, session_date)`, con sus sets en `workout_log_sets`. Toda escritura (alumna detallada, botones rápidos, coach) pasa por un único helper de upsert (`lib/workouts/log-session.ts`) que reemplaza los sets. El estado por ejercicio y la racha se **derivan** en la capa de dominio pura (`domain/workouts/progression.ts`, `streak.ts`), testeada con Vitest. La UI lee todo desde queries server-only.

**Tech Stack:** Next.js 16 (App Router, Server Components + server actions), TypeScript strict (`noUncheckedIndexedAccess`), Supabase (`@supabase/ssr` + admin client), Zod v4, Vitest, Tailwind v4. Gráfico con SVG puro (sin librería de charts; esa entra en el sub-proyecto C).

**Convención TS strict:** el acceso por índice devuelve `T | undefined`. Usa `?.`, `?? fallback`, y `Map.get(...)` con guardas. Nunca asumas que `arr[0]` existe.

**Patrón de commits:** un commit por tarea, mensaje en español, sin secretos, terminando con la línea Co-Authored-By.

---

## Estructura de archivos

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `supabase/migrations/0014_workout_session_progression.sql` | Índice de apoyo en `workout_log_sets(exercise_id)` + backfill idempotente de `session_date` | Crear |
| `domain/workouts/progression.ts` | Lógica pura: serie de peso máximo, último peso, estado hecho/no hecho por ejercicio | Crear |
| `domain/workouts/progression.test.ts` | Tests Vitest de progression | Crear |
| `domain/workouts/streak.ts` | Lógica pura: racha de sesiones programadas completadas | Crear |
| `domain/workouts/streak.test.ts` | Tests Vitest de streak | Crear |
| `lib/workouts/log-session.ts` | Helper único de upsert de sesión + reemplazo de sets (compartido alumna/coach) | Crear |
| `lib/student/actions.ts` | `logWorkout` usa el helper y escribe `session_date` | Modificar |
| `lib/coach/actions.ts` | Nueva acción `coachLogStudentSession` | Modificar |
| `lib/db/queries/training-calendar.ts` | Devuelve sets por sesión (para ✓/✗) y `exercise_id` por ejercicio del plan | Modificar |
| `lib/db/queries/exercise-progression.ts` | Series de peso máximo por ejercicio + últimos pesos para una alumna | Crear |
| `components/workouts/SessionCompleteCard.tsx` | Tarjeta de celebración (anillo 100% + racha + ✓/✗) | Crear |
| `components/workouts/ExerciseProgressChart.tsx` | Mini-gráfico SVG de peso máximo por ejercicio | Crear |
| `components/student/GuidedWorkoutLogForm.tsx` | Prefill último peso + sugerido + tendencia + toggle progreso | Modificar |
| `app/(protected)/student/today/page.tsx` | Celebración si la sesión de hoy está hecha | Modificar |
| `app/(protected)/student/workout/page.tsx` | Pasa últimos pesos y series al formulario | Modificar |
| `components/workouts/TrainingCalendar.tsx` | Detalle del día con ✓/✗ por ejercicio | Modificar |
| `app/(protected)/coach/students/[studentId]/calendar/page.tsx` | Edición de la coach (marca día + registra detalle) | Modificar |

---

## Task 1: Migración 0014 (índice de progresión + backfill de session_date)

**Files:**
- Create: `supabase/migrations/0014_workout_session_progression.sql`

- [ ] **Step 1: Escribir la migración (idempotente)**

```sql
-- 0014_workout_session_progression.sql
-- Apoyo a las consultas de progresión por ejercicio y unificación de sesiones.
-- Idempotente: se puede correr más de una vez sin romper.

-- Índice para series de peso máximo por ejercicio (consulta por exercise_id).
create index if not exists workout_log_sets_exercise_idx
  on public.workout_log_sets (exercise_id);

-- Backfill: las sesiones detalladas antiguas se guardaban con session_date = NULL.
-- Si tienen workout_plan_day_id, se les asigna la fecha de logged_at para que el
-- calendario las vea. No toca las que ya tienen session_date.
update public.workout_logs
set session_date = (logged_at at time zone 'utc')::date
where session_date is null
  and workout_plan_day_id is not null;
```

- [ ] **Step 2: Aplicar la migración vía Management API**

Lee `C:\EveFitMethod\OPERATIONS.local.md` para el token de Supabase Management y el project ref. Aplica el SQL con `POST /v1/projects/{ref}/database/query` (header `Authorization: Bearer <SBP_TOKEN>`, body `{"query": "<contenido del archivo>"}`). Verifica que la respuesta no traiga error.

Expected: respuesta `[]` o sin campo `error` (un `update` no devuelve filas).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0014_workout_session_progression.sql
git commit -F- <<'EOF'
feat(db): migracion 0014 indice de progresion + backfill session_date

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 2: Dominio — progression.ts (peso máximo, último peso, estado por ejercicio)

**Files:**
- Create: `domain/workouts/progression.ts`
- Test: `domain/workouts/progression.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
// domain/workouts/progression.test.ts
import { describe, it, expect } from 'vitest';
import {
  maxWeightSeries,
  lastWeightForExercise,
  exerciseStatusForDay,
  type LoggedSet,
} from './progression';

const sets: LoggedSet[] = [
  { exercise_id: 'A', weight_kg: 10, completed: true, session_date: '2026-06-01' },
  { exercise_id: 'A', weight_kg: 12, completed: true, session_date: '2026-06-01' },
  { exercise_id: 'A', weight_kg: 15, completed: true, session_date: '2026-06-08' },
  { exercise_id: 'A', weight_kg: 0, completed: false, session_date: '2026-06-08' },
  { exercise_id: 'B', weight_kg: 40, completed: true, session_date: '2026-06-08' },
  { exercise_id: 'A', weight_kg: null, completed: true, session_date: '2026-06-15' },
];

describe('maxWeightSeries', () => {
  it('da el peso máximo por sesión, ordenado por fecha, ignorando pesos nulos', () => {
    expect(maxWeightSeries(sets, 'A')).toEqual([
      { dateISO: '2026-06-01', maxKg: 12 },
      { dateISO: '2026-06-08', maxKg: 15 },
    ]);
  });
  it('devuelve vacío si el ejercicio no tiene registros con peso', () => {
    expect(maxWeightSeries(sets, 'Z')).toEqual([]);
  });
});

describe('lastWeightForExercise', () => {
  it('toma el peso máximo de la sesión más reciente con peso', () => {
    expect(lastWeightForExercise(sets, 'A')).toBe(15);
  });
  it('devuelve null si no hay registros con peso', () => {
    expect(lastWeightForExercise(sets, 'Z')).toBeNull();
  });
});

describe('exerciseStatusForDay', () => {
  it('marca hecho si hay al menos un set completado, no hecho si no', () => {
    const sessionSets: LoggedSet[] = [
      { exercise_id: 'A', weight_kg: 15, completed: true, session_date: '2026-06-08' },
      { exercise_id: 'B', weight_kg: 40, completed: false, session_date: '2026-06-08' },
    ];
    expect(exerciseStatusForDay(['A', 'B', 'C'], sessionSets)).toEqual({
      A: 'done',
      B: 'missed',
      C: 'missed',
    });
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npm run test -- progression`
Expected: FAIL — `Cannot find module './progression'`.

- [ ] **Step 3: Implementar progression.ts**

```typescript
// domain/workouts/progression.ts
/**
 * Lógica pura de progresión de entrenamiento. Sin dependencias de DB ni de fecha
 * del sistema. Trabaja sobre sets ya registrados (workout_log_sets enriquecidos
 * con la session_date de su workout_log).
 */

export interface LoggedSet {
  exercise_id: string | null;
  weight_kg: number | null;
  completed: boolean;
  session_date: string | null; // ISO YYYY-MM-DD
}

export interface MaxWeightPoint {
  dateISO: string;
  maxKg: number;
}

/**
 * Serie de peso máximo levantado por sesión para un ejercicio. Solo cuenta sets
 * con peso numérico (> = 0). Ordenada ascendente por fecha. Una sesión sin peso
 * registrado no aparece.
 */
export function maxWeightSeries(sets: LoggedSet[], exerciseId: string): MaxWeightPoint[] {
  const byDate = new Map<string, number>();
  for (const s of sets) {
    if (s.exercise_id !== exerciseId) continue;
    if (s.weight_kg == null || !s.session_date) continue;
    const prev = byDate.get(s.session_date);
    if (prev == null || s.weight_kg > prev) byDate.set(s.session_date, s.weight_kg);
  }
  return [...byDate.entries()]
    .map(([dateISO, maxKg]) => ({ dateISO, maxKg }))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0));
}

/** Último peso usado en un ejercicio: el máximo de la sesión más reciente con peso. */
export function lastWeightForExercise(sets: LoggedSet[], exerciseId: string): number | null {
  const series = maxWeightSeries(sets, exerciseId);
  const last = series[series.length - 1];
  return last ? last.maxKg : null;
}

export type ExerciseDayStatus = 'done' | 'missed';

/**
 * Estado por ejercicio dentro de una sesión: 'done' si tiene al menos un set
 * completado; 'missed' si está en el plan pero no tiene ningún set completado.
 */
export function exerciseStatusForDay(
  planExerciseIds: string[],
  sessionSets: LoggedSet[],
): Record<string, ExerciseDayStatus> {
  const doneIds = new Set<string>();
  for (const s of sessionSets) {
    if (s.completed && s.exercise_id) doneIds.add(s.exercise_id);
  }
  const out: Record<string, ExerciseDayStatus> = {};
  for (const id of planExerciseIds) {
    out[id] = doneIds.has(id) ? 'done' : 'missed';
  }
  return out;
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npm run test -- progression`
Expected: PASS (6 tests verdes).

- [ ] **Step 5: Commit**

```bash
git add domain/workouts/progression.ts domain/workouts/progression.test.ts
git commit -F- <<'EOF'
feat(domain): progresion por ejercicio (peso maximo, ultimo peso, estado)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 3: Dominio — streak.ts (racha de sesiones completadas)

**Files:**
- Create: `domain/workouts/streak.ts`
- Test: `domain/workouts/streak.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
// domain/workouts/streak.test.ts
import { describe, it, expect } from 'vitest';
import { currentStreak, type ScheduledSession } from './streak';

function key(planDayId: string, dateISO: string) {
  return `${planDayId}|${dateISO}`;
}

const scheduled: ScheduledSession[] = [
  { dateISO: '2026-06-01', planDayId: 'p1' }, // lun
  { dateISO: '2026-06-03', planDayId: 'p2' }, // mié
  { dateISO: '2026-06-05', planDayId: 'p3' }, // vie
  { dateISO: '2026-06-08', planDayId: 'p1' }, // lun (hoy)
];

describe('currentStreak', () => {
  it('cuenta sesiones programadas completadas consecutivas hacia atrás', () => {
    const status = {
      [key('p1', '2026-06-01')]: 'completed' as const,
      [key('p2', '2026-06-03')]: 'completed' as const,
      [key('p3', '2026-06-05')]: 'completed' as const,
    };
    // Hoy (2026-06-08) aún no se completa: no rompe, no cuenta.
    expect(currentStreak(scheduled, status, '2026-06-08')).toBe(3);
  });

  it('cuenta hoy si ya está completado', () => {
    const status = {
      [key('p3', '2026-06-05')]: 'completed' as const,
      [key('p1', '2026-06-08')]: 'completed' as const,
    };
    expect(currentStreak(scheduled, status, '2026-06-08')).toBe(2);
  });

  it('una sesión pasada saltada rompe la racha', () => {
    const status = {
      [key('p1', '2026-06-01')]: 'completed' as const,
      [key('p2', '2026-06-03')]: 'skipped' as const,
      [key('p3', '2026-06-05')]: 'completed' as const,
    };
    expect(currentStreak(scheduled, status, '2026-06-08')).toBe(1);
  });

  it('una sesión pasada sin registro rompe la racha', () => {
    const status = {
      [key('p3', '2026-06-05')]: 'completed' as const,
    };
    // p1 (06-01) y p2 (06-03) no tienen registro -> al llegar a ellas, corta.
    expect(currentStreak(scheduled, status, '2026-06-08')).toBe(1);
  });

  it('devuelve 0 sin sesiones programadas', () => {
    expect(currentStreak([], {}, '2026-06-08')).toBe(0);
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npm run test -- streak`
Expected: FAIL — `Cannot find module './streak'`.

- [ ] **Step 3: Implementar streak.ts**

```typescript
// domain/workouts/streak.ts
/**
 * Racha de entrenamiento: número de sesiones PROGRAMADAS completadas de forma
 * consecutiva, contando hacia atrás desde hoy. Los días de descanso (no
 * programados) no rompen la racha. Una sesión programada pasada sin completar
 * (saltada o sin registro) sí la rompe. La sesión de HOY, si aún no está
 * completada, no cuenta ni rompe (sigue pendiente).
 */

export interface ScheduledSession {
  dateISO: string; // ISO YYYY-MM-DD
  planDayId: string;
}

type Status = 'completed' | 'skipped' | 'started';

export function currentStreak(
  scheduled: ScheduledSession[],
  statusByKey: Record<string, Status>,
  todayISO: string,
): number {
  const past = scheduled
    .filter((s) => s.dateISO <= todayISO)
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0)); // desc

  let streak = 0;
  for (const s of past) {
    const status = statusByKey[`${s.planDayId}|${s.dateISO}`];
    if (s.dateISO === todayISO && status !== 'completed') {
      continue; // hoy sigue pendiente: ni cuenta ni rompe
    }
    if (status === 'completed') {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npm run test -- streak`
Expected: PASS (5 tests verdes).

- [ ] **Step 5: Commit**

```bash
git add domain/workouts/streak.ts domain/workouts/streak.test.ts
git commit -F- <<'EOF'
feat(domain): racha de sesiones de entrenamiento completadas

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 4: Helper único de escritura de sesión (`lib/workouts/log-session.ts`)

**Files:**
- Create: `lib/workouts/log-session.ts`

- [ ] **Step 1: Implementar el helper de upsert + reemplazo de sets**

```typescript
// lib/workouts/log-session.ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface SessionSetInput {
  exerciseId: string | null;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  completed: boolean;
}

export interface UpsertSessionArgs {
  studentId: string;
  coachId: string | null;
  planId: string | null;
  planDayId: string | null;
  sessionDateISO: string; // YYYY-MM-DD
  status: 'completed' | 'skipped';
  perceivedEffort?: number | null;
  notes?: string | null;
  sets: SessionSetInput[];
}

/**
 * Única vía de escritura de una sesión de entrenamiento. Garantiza una sola fila
 * en workout_logs por (student_id, workout_plan_day_id, session_date) y reemplaza
 * sus sets. El llamador DEBE haber autorizado antes (alumna dueña o coach dueña).
 * Funciona igual con el cliente RLS (alumna) o el admin (coach).
 */
export async function upsertWorkoutSession(
  db: SupabaseClient,
  args: UpsertSessionArgs,
): Promise<{ error?: string }> {
  let logId: string | null = null;

  // Solo deduplicamos cuando hay día de plan (las sesiones ad-hoc sin día no se
  // colapsan; el índice único parcial no aplica a planDayId nulo de todos modos).
  if (args.planDayId) {
    const { data: existing } = await db
      .from('workout_logs')
      .select('id')
      .eq('student_id', args.studentId)
      .eq('workout_plan_day_id', args.planDayId)
      .eq('session_date', args.sessionDateISO)
      .maybeSingle();
    if (existing) logId = existing.id;
  }

  if (logId) {
    const { error } = await db
      .from('workout_logs')
      .update({
        status: args.status,
        logged_at: new Date().toISOString(),
        perceived_effort: args.perceivedEffort ?? null,
        notes: args.notes ?? null,
        coach_id: args.coachId,
        workout_plan_id: args.planId,
      })
      .eq('id', logId);
    if (error) return { error: error.message };
    await db.from('workout_log_sets').delete().eq('workout_log_id', logId);
  } else {
    const { data: created, error } = await db
      .from('workout_logs')
      .insert({
        student_id: args.studentId,
        coach_id: args.coachId,
        workout_plan_id: args.planId,
        workout_plan_day_id: args.planDayId,
        session_date: args.sessionDateISO,
        logged_at: new Date().toISOString(),
        status: args.status,
        perceived_effort: args.perceivedEffort ?? null,
        notes: args.notes ?? null,
      })
      .select('id')
      .single();
    if (error || !created) return { error: error?.message ?? 'No se pudo guardar la sesión.' };
    logId = created.id;
  }

  const rows = args.sets.map((s) => ({
    workout_log_id: logId,
    exercise_id: s.exerciseId,
    set_number: s.setNumber,
    reps_completed: s.reps,
    weight_kg: s.weight,
    completed: s.completed,
  }));
  if (rows.length > 0) {
    const { error } = await db.from('workout_log_sets').insert(rows);
    if (error) return { error: error.message };
  }
  return {};
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS (sin errores nuevos).

- [ ] **Step 3: Commit**

```bash
git add lib/workouts/log-session.ts
git commit -F- <<'EOF'
feat(workouts): helper unico de upsert de sesion + reemplazo de sets

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 5: `logWorkout` usa el helper y escribe `session_date`

**Files:**
- Modify: `lib/student/actions.ts:94-144`

- [ ] **Step 1: Reescribir `logWorkout` para usar el helper con la fecha de hoy**

Reemplaza la función `logWorkout` completa (líneas 94-144) por:

```typescript
export async function logWorkout(input: LogWorkoutInput): Promise<{ error?: string; success?: boolean }> {
  const student = await requireStudent();

  const parsed = workoutLogSchema.safeParse({
    workout_plan_id: input.workoutPlanId ?? null,
    workout_plan_day_id: input.workoutPlanDayId ?? null,
    perceived_effort: input.perceivedEffort ?? null,
    notes: input.notes || undefined,
    sets: (input.sets ?? []).map((s) => ({
      exercise_id: s.exerciseId ?? null,
      set_number: s.setNumber,
      reps_completed: s.reps ?? null,
      weight_kg: s.weight ?? null,
      completed: s.completed,
    })),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const coachId = await getStudentCoachId(student.id);
  const todayISO = new Date().toISOString().slice(0, 10);

  const { error } = await upsertWorkoutSession(supabase, {
    studentId: student.id,
    coachId,
    planId: input.workoutPlanId ?? null,
    planDayId: input.workoutPlanDayId ?? null,
    sessionDateISO: todayISO,
    status: 'completed',
    perceivedEffort: input.perceivedEffort ?? null,
    notes: input.notes ?? null,
    sets: (input.sets ?? []).map((s) => ({
      exerciseId: s.exerciseId ?? null,
      setNumber: s.setNumber,
      reps: s.reps ?? null,
      weight: s.weight ?? null,
      completed: s.completed,
    })),
  });
  if (error) return { error };

  revalidatePath('/student/workout');
  revalidatePath('/student/today');
  return { success: true };
}
```

- [ ] **Step 2: Añadir el import del helper**

En el bloque de imports al inicio de `lib/student/actions.ts` (después de la línea 9 `import { workoutLogSchema } ...`), añade:

```typescript
import { upsertWorkoutSession } from '@/lib/workouts/log-session';
```

- [ ] **Step 3: Verificar tipos y build**

Run: `npm run typecheck`
Expected: PASS. (`logWorkout` ya no inserta a mano; usa el helper.)

- [ ] **Step 4: Commit**

```bash
git add lib/student/actions.ts
git commit -F- <<'EOF'
fix(student): logWorkout escribe session_date y usa helper unico

Antes guardaba session_date = NULL, invisible para el calendario.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 6: Acción de la coach para registrar la sesión de una alumna

**Files:**
- Modify: `lib/coach/actions.ts` (añadir nueva acción al final del archivo)

- [ ] **Step 1: Añadir la acción `coachLogStudentSession`**

Añade al final de `lib/coach/actions.ts`:

```typescript
export async function coachLogStudentSession(input: {
  studentId: string;
  planId: string | null;
  planDayId: string | null;
  dateISO: string;
  perceivedEffort?: number | null;
  notes?: string | null;
  sets: { exerciseId: string | null; setNumber: number; reps: number | null; weight: number | null; completed: boolean }[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, input.studentId);

  const admin = createAdminClient();
  const { error } = await upsertWorkoutSession(admin, {
    studentId: input.studentId,
    coachId: coach.id,
    planId: input.planId,
    planDayId: input.planDayId,
    sessionDateISO: input.dateISO,
    status: 'completed',
    perceivedEffort: input.perceivedEffort ?? null,
    notes: input.notes ?? null,
    sets: input.sets,
  });
  if (error) return { ok: false, error };

  revalidatePath(`/coach/students/${input.studentId}/calendar`);
  revalidatePath('/student/today');
  return { ok: true };
}
```

- [ ] **Step 2: Verificar/añadir imports en `lib/coach/actions.ts`**

Confirma que el archivo ya importa `requireCoach`, `assertCoachOwnsStudent` (de `@/lib/auth/roles`), `createAdminClient` (de `@/lib/supabase/admin`) y `revalidatePath` (de `next/cache`). Si falta `upsertWorkoutSession`, añade:

```typescript
import { upsertWorkoutSession } from '@/lib/workouts/log-session';
```

(Si `requireCoach` no estuviera importado, añádelo desde `@/lib/auth/roles` junto a los demás guardas.)

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/coach/actions.ts
git commit -F- <<'EOF'
feat(coach): registrar/corregir la sesion de una alumna desde el calendario

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 7: Ampliar `getTrainingCalendarData` con sets por sesión y `exercise_id`

**Files:**
- Modify: `lib/db/queries/training-calendar.ts`

- [ ] **Step 1: Añadir `exercise_id` a `CalendarExercise` y los nuevos campos al tipo de retorno**

Reemplaza la interfaz `CalendarExercise` (líneas 20-25) por:

```typescript
export interface CalendarExercise {
  exercise_id: string | null;
  name: string;
  sets: number;
  reps: string;
  suggested_weight_kg: number | null;
}
```

Reemplaza la interfaz `TrainingCalendarData` (líneas 29-35) por:

```typescript
export interface LoggedSessionSet {
  exercise_id: string | null;
  weight_kg: number | null;
  completed: boolean;
}

export interface TrainingCalendarData {
  plan: CalendarPlan | null;
  days: CalendarPlanDay[];
  exercisesByDay: Record<string, CalendarExercise[]>;
  /** Map keyed by `${planDayId}|${dateISO}` -> log status. */
  statusByKey: Record<string, CalendarLogStatus>;
  /** Map keyed by `${planDayId}|${dateISO}` -> sets registrados de esa sesión. */
  setsByKey: Record<string, LoggedSessionSet[]>;
}
```

- [ ] **Step 2: Poblar `exercise_id` en `exercisesByDay`**

En el bucle que construye `exercisesByDay` (líneas 92-101), añade `exercise_id: pe.exercise_id,` al objeto que se hace push:

```typescript
  for (const pe of planExercises ?? []) {
    const arr = exercisesByDay[pe.workout_plan_day_id] ?? [];
    arr.push({
      exercise_id: pe.exercise_id,
      name: pe.exercise_id ? (exMap.get(pe.exercise_id) ?? 'Ejercicio (eliminado)') : 'Ejercicio',
      sets: pe.sets,
      reps: pe.reps,
      suggested_weight_kg: pe.suggested_weight_kg,
    });
    exercisesByDay[pe.workout_plan_day_id] = arr;
  }
```

- [ ] **Step 3: Traer los sets de las sesiones y construir `setsByKey`**

Justo después del bloque que construye `statusByKey` (después de la línea 108), añade:

```typescript
  // Sets de cada sesión registrada, para derivar ✓/✗ por ejercicio.
  const logIdToKey = new Map<string, string>();
  for (const log of logs ?? []) {
    if (!log.session_date || !log.workout_plan_day_id) continue;
    logIdToKey.set(log.id, `${log.workout_plan_day_id}|${log.session_date}`);
  }
  const logIds = [...logIdToKey.keys()];
  const { data: logSets } = logIds.length
    ? await supabase
        .from('workout_log_sets')
        .select('workout_log_id, exercise_id, weight_kg, completed')
        .in('workout_log_id', logIds)
    : { data: [] };

  const setsByKey: Record<string, LoggedSessionSet[]> = {};
  for (const s of logSets ?? []) {
    const k = logIdToKey.get(s.workout_log_id);
    if (!k) continue;
    const arr = setsByKey[k] ?? [];
    arr.push({ exercise_id: s.exercise_id, weight_kg: s.weight_kg, completed: s.completed });
    setsByKey[k] = arr;
  }
```

- [ ] **Step 4: Devolver `setsByKey` en el return**

En el objeto de retorno (líneas 110-127), añade `setsByKey,` junto a `statusByKey,`.

- [ ] **Step 5: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS. (Los consumidores actuales no se rompen: solo se añadieron campos.)

- [ ] **Step 6: Commit**

```bash
git add lib/db/queries/training-calendar.ts
git commit -F- <<'EOF'
feat(calendar): sets por sesion + exercise_id para derivar estado por ejercicio

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 8: Query de series de peso máximo por ejercicio

**Files:**
- Create: `lib/db/queries/exercise-progression.ts`

- [ ] **Step 1: Implementar la query**

```typescript
// lib/db/queries/exercise-progression.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { maxWeightSeries, lastWeightForExercise, type LoggedSet, type MaxWeightPoint } from '@/domain/workouts/progression';

export interface ExerciseProgression {
  /** exerciseId -> serie de peso máximo por sesión (ascendente por fecha). */
  seriesByExercise: Record<string, MaxWeightPoint[]>;
  /** exerciseId -> último peso usado (o null). */
  lastWeightByExercise: Record<string, number>;
}

/**
 * Series de peso máximo y último peso por ejercicio para una alumna, derivadas de
 * sus workout_log_sets (uniendo la session_date de cada workout_log). Limitado a
 * los exerciseIds dados (los del plan activo) para no traer historial irrelevante.
 */
export async function getExerciseProgression(
  studentId: string,
  exerciseIds: string[],
): Promise<ExerciseProgression> {
  if (exerciseIds.length === 0) {
    return { seriesByExercise: {}, lastWeightByExercise: {} };
  }
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('workout_logs')
    .select('id, session_date')
    .eq('student_id', studentId)
    .not('session_date', 'is', null);

  const logDate = new Map<string, string>();
  for (const l of logs ?? []) {
    if (l.session_date) logDate.set(l.id, l.session_date);
  }
  const logIds = [...logDate.keys()];
  if (logIds.length === 0) {
    return { seriesByExercise: {}, lastWeightByExercise: {} };
  }

  const { data: rows } = await supabase
    .from('workout_log_sets')
    .select('workout_log_id, exercise_id, weight_kg, completed')
    .in('workout_log_id', logIds)
    .in('exercise_id', exerciseIds);

  const sets: LoggedSet[] = (rows ?? []).map((r) => ({
    exercise_id: r.exercise_id,
    weight_kg: r.weight_kg,
    completed: r.completed,
    session_date: logDate.get(r.workout_log_id) ?? null,
  }));

  const seriesByExercise: Record<string, MaxWeightPoint[]> = {};
  const lastWeightByExercise: Record<string, number> = {};
  for (const id of exerciseIds) {
    const series = maxWeightSeries(sets, id);
    if (series.length > 0) seriesByExercise[id] = series;
    const last = lastWeightForExercise(sets, id);
    if (last != null) lastWeightByExercise[id] = last;
  }
  return { seriesByExercise, lastWeightByExercise };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/db/queries/exercise-progression.ts
git commit -F- <<'EOF'
feat(queries): series de peso maximo + ultimo peso por ejercicio

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 9: Componente `SessionCompleteCard` (anillo + racha + ✓/✗)

**Files:**
- Create: `components/workouts/SessionCompleteCard.tsx`

- [ ] **Step 1: Implementar el componente (server component, animación CSS)**

```tsx
// components/workouts/SessionCompleteCard.tsx
import { Check, Flame, X } from 'lucide-react';

export interface SessionExerciseLine {
  name: string;
  status: 'done' | 'missed';
}

/**
 * Tarjeta de "sesión completada": anillo escarlata al 100% con visto, racha y el
 * desglose ✓/✗ por ejercicio. El anillo se llena con animación CSS; respeta
 * prefers-reduced-motion vía la clase global definida en globals.css (Task 12).
 */
export function SessionCompleteCard({
  dateLabel,
  focusLabel,
  streak,
  exercises,
  skipped = false,
}: {
  dateLabel: string;
  focusLabel: string;
  streak: number;
  exercises: SessionExerciseLine[];
  skipped?: boolean;
}) {
  const circumference = 2 * Math.PI * 30; // r = 30
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative size-[72px] shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--color-hairline)" strokeWidth="7" />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="7"
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              className="efm-ring"
              style={{ ['--efm-circ' as string]: `${circumference}` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Check className="size-7 text-primary" />
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {skipped ? 'Sesión marcada como no hecha' : '¡Sesión completada!'}
          </p>
          <p className="text-sm text-muted">
            {dateLabel} · {focusLabel}
          </p>
          {streak > 0 && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Flame className="size-3.5" /> Racha de {streak} {streak === 1 ? 'día' : 'días'}
            </span>
          )}
        </div>
      </div>

      {exercises.length > 0 && (
        <ul className="space-y-2">
          {exercises.map((ex, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {ex.status === 'done' ? (
                <Check className="size-4 text-primary" />
              ) : (
                <X className="size-4 text-faint" />
              )}
              <span className={ex.status === 'done' ? 'text-foreground' : 'text-faint'}>{ex.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/workouts/SessionCompleteCard.tsx
git commit -F- <<'EOF'
feat(workouts): tarjeta de sesion completada (anillo + racha + checklist)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 10: Componente `ExerciseProgressChart` (SVG, sin librería)

**Files:**
- Create: `components/workouts/ExerciseProgressChart.tsx`

- [ ] **Step 1: Implementar el mini-gráfico de peso máximo**

```tsx
// components/workouts/ExerciseProgressChart.tsx
import type { MaxWeightPoint } from '@/domain/workouts/progression';

/**
 * Mini-gráfico de barras del peso máximo por sesión de un ejercicio. SVG puro,
 * responsive (viewBox), sin dependencias. Muestra hasta los últimos 8 puntos.
 */
export function ExerciseProgressChart({ series }: { series: MaxWeightPoint[] }) {
  const points = series.slice(-8);
  if (points.length === 0) {
    return <p className="text-xs text-faint">Sin datos de progreso aún. Registra tu peso para verlo aquí.</p>;
  }
  const max = Math.max(...points.map((p) => p.maxKg), 1);
  const W = 280;
  const H = 80;
  const gap = 8;
  const barW = (W - gap * (points.length - 1)) / points.length;

  const first = points[0]?.maxKg ?? 0;
  const last = points[points.length - 1]?.maxKg ?? 0;
  const delta = last - first;

  return (
    <div className="space-y-1.5">
      <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label="Progreso de peso máximo">
        {points.map((p, i) => {
          const h = Math.round((p.maxKg / max) * H);
          const x = i * (barW + gap);
          const y = H - h;
          return (
            <g key={p.dateISO}>
              <rect x={x} y={y} width={barW} height={h} rx="3" fill="var(--color-primary)" opacity={0.25 + 0.75 * (i / Math.max(1, points.length - 1))} />
              <text x={x + barW / 2} y={H + 13} textAnchor="middle" fontSize="9" fill="var(--color-faint)">
                {p.maxKg}
              </text>
            </g>
          );
        })}
      </svg>
      {points.length > 1 && (
        <p className="text-xs text-muted">
          {delta > 0 ? `↗ +${delta} kg` : delta < 0 ? `↘ ${delta} kg` : '→ igual'} desde el inicio
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/workouts/ExerciseProgressChart.tsx
git commit -F- <<'EOF'
feat(workouts): mini-grafico SVG de peso maximo por ejercicio

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 11: `GuidedWorkoutLogForm` — prefill último peso + tendencia + toggle progreso

**Files:**
- Modify: `components/student/GuidedWorkoutLogForm.tsx`

- [ ] **Step 1: Añadir imports y nuevas props**

Reemplaza las líneas 5-8 (imports) por:

```tsx
import { PlayCircle, TrendingUp } from 'lucide-react';
import { logWorkout } from '@/lib/student/actions';
import { Button, FormField, Input, Textarea, YouTubeEmbed } from '@/components/common';
import { ExerciseProgressChart } from '@/components/workouts/ExerciseProgressChart';
import type { MaxWeightPoint } from '@/domain/workouts/progression';
import type { PlanDay } from '@/lib/db/queries/workout-plan';
```

Reemplaza la firma del componente (líneas 49-55) por:

```tsx
export function GuidedWorkoutLogForm({
  workoutPlanId,
  days,
  lastWeightByExercise,
  seriesByExercise,
}: {
  workoutPlanId: string | null;
  days: PlanDay[];
  lastWeightByExercise: Record<string, number>;
  seriesByExercise: Record<string, MaxWeightPoint[]>;
}) {
```

- [ ] **Step 2: Prefill del último peso en `buildBlocks`**

`buildBlocks` necesita el mapa de últimos pesos. Cambia su firma y el cálculo del peso por defecto. Reemplaza la función `buildBlocks` (líneas 27-47) por:

```tsx
function buildBlocks(day: PlanDay | undefined, lastWeightByExercise: Record<string, number>): ExBlock[] {
  if (!day) return [];
  return day.exercises.map((ex, bi) => {
    const defaultReps = ex.reps.match(/\d+/)?.[0] ?? '';
    const last = ex.exercise_id ? lastWeightByExercise[ex.exercise_id] : undefined;
    const defaultWeight = last != null ? String(last) : ex.suggested_weight_kg != null ? String(ex.suggested_weight_kg) : '';
    return {
      key: ex.id ?? String(bi),
      exerciseId: ex.exercise_id,
      name: ex.exercise_name,
      targetReps: ex.reps,
      targetSets: ex.sets,
      suggested: ex.suggested_weight_kg,
      rest: ex.rest_seconds,
      videoUrl: ex.video_url,
      sets: Array.from({ length: Math.max(1, ex.sets) }, () => ({
        reps: defaultReps,
        weight: defaultWeight,
        completed: false,
      })),
    };
  });
}
```

- [ ] **Step 3: Actualizar las llamadas a `buildBlocks` y el estado de progreso abierto**

En el cuerpo del componente, donde se inicializa `blocks` (línea 59) y dentro de `selectDay` (línea 68), pasa el nuevo argumento, y añade un estado para el panel de progreso abierto. Reemplaza las líneas 59-70 por:

```tsx
  const [blocks, setBlocks] = useState<ExBlock[]>(() => buildBlocks(days[0], lastWeightByExercise));
  const [openVideo, setOpenVideo] = useState<string | null>(null);
  const [openProgress, setOpenProgress] = useState<string | null>(null);
  const [effort, setEffort] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function selectDay(id: string) {
    setDayId(id);
    setBlocks(buildBlocks(days.find((d) => d.id === id), lastWeightByExercise));
    setOpenVideo(null);
    setOpenProgress(null);
  }
```

- [ ] **Step 4: Mostrar sugerido + tendencia + botón "Progreso" y el panel del gráfico**

En el bloque de cada ejercicio, junto al botón "Técnica" (líneas 146-154), añade un botón "Progreso" cuando haya serie. Reemplaza el `div` de cabecera del ejercicio (líneas 137-155) por:

```tsx
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{b.name}</p>
                <p className="tabular text-xs text-muted">
                  Objetivo: {b.targetSets}×{b.targetReps}
                  {b.rest ? ` · ${b.rest}s desc.` : ''}
                  {b.suggested != null ? ` · sug. coach ${b.suggested}kg` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {b.exerciseId && (seriesByExercise[b.exerciseId]?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpenProgress(openProgress === b.key ? null : b.key)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <TrendingUp className="size-4" /> Progreso
                  </button>
                )}
                {b.videoUrl && (
                  <button
                    type="button"
                    onClick={() => setOpenVideo(openVideo === b.key ? null : b.key)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <PlayCircle className="size-4" /> Técnica
                  </button>
                )}
              </div>
            </div>

            {b.exerciseId && openProgress === b.key && (
              <div className="mt-3 rounded-md border border-hairline bg-canvas/40 p-3">
                <ExerciseProgressChart series={seriesByExercise[b.exerciseId] ?? []} />
              </div>
            )}
```

- [ ] **Step 5: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS. (El formulario ahora exige `lastWeightByExercise` y `seriesByExercise`; los provee Task 12.)

- [ ] **Step 6: Commit**

```bash
git add components/student/GuidedWorkoutLogForm.tsx
git commit -F- <<'EOF'
feat(student): prefill ultimo peso + sugerido del coach + grafico de progreso

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 12: Página "Hoy" — celebración + estilos de animación

**Files:**
- Modify: `app/(protected)/student/today/page.tsx`
- Modify: `app/globals.css` (añadir keyframes del anillo + reduced-motion)

- [ ] **Step 1: Añadir los keyframes del anillo a globals.css**

Añade al final de `app/globals.css`:

```css
@keyframes efm-ring-fill {
  from { stroke-dashoffset: var(--efm-circ); }
  to { stroke-dashoffset: 0; }
}
.efm-ring {
  animation: efm-ring-fill 1s ease-out 0.15s both;
}
@media (prefers-reduced-motion: reduce) {
  .efm-ring { animation: none; stroke-dashoffset: 0; }
}
```

- [ ] **Step 2: Calcular el estado de la sesión de hoy y la racha en la página**

En `app/(protected)/student/today/page.tsx`, reemplaza el bloque de imports (líneas 1-17) por:

```tsx
import Link from 'next/link';
import { Dumbbell, Moon, Plus, Scale } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import { getStudentToday } from '@/lib/db/queries/student';
import { getTrainingCalendarData } from '@/lib/db/queries/training-calendar';
import { buildCalendar } from '@/domain/workouts/calendar';
import { exerciseStatusForDay, type LoggedSet } from '@/domain/workouts/progression';
import { currentStreak, type ScheduledSession } from '@/domain/workouts/streak';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from '@/components/common';
import { MacroProgress } from '@/components/student/MacroProgress';
import { MacroRescuePanel } from '@/components/student/MacroRescuePanel';
import { SessionCompleteCard, type SessionExerciseLine } from '@/components/workouts/SessionCompleteCard';
```

- [ ] **Step 3: Derivar el estado de hoy**

Reemplaza las líneas 25-28 (cálculo de `todayPlanDay`) por:

```tsx
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayPlanDay = calendar.plan
    ? buildCalendar(calendar.days, calendar.plan.starts_at, calendar.plan.weeks, todayISO, todayISO)[0]?.planDay ?? null
    : null;

  const todayKey = todayPlanDay ? `${todayPlanDay.id}|${todayISO}` : null;
  const todayStatus = todayKey ? calendar.statusByKey[todayKey] ?? null : null;
  const todayDone = todayStatus === 'completed' || todayStatus === 'skipped';

  // Racha: sesiones programadas desde el inicio del plan hasta hoy.
  let streak = 0;
  let todayExerciseLines: SessionExerciseLine[] = [];
  if (calendar.plan && todayPlanDay) {
    const scheduled: ScheduledSession[] = buildCalendar(
      calendar.days,
      calendar.plan.starts_at,
      calendar.plan.weeks,
      calendar.plan.starts_at ?? todayISO,
      todayISO,
    )
      .filter((d) => d.planDay)
      .map((d) => ({ dateISO: d.dateISO, planDayId: d.planDay!.id }));
    streak = currentStreak(scheduled, calendar.statusByKey, todayISO);

    const planExercises = calendar.exercisesByDay[todayPlanDay.id] ?? [];
    const sessionSets: LoggedSet[] = (calendar.setsByKey[todayKey!] ?? []).map((s) => ({
      exercise_id: s.exercise_id,
      weight_kg: s.weight_kg,
      completed: s.completed,
      session_date: todayISO,
    }));
    const planIds = planExercises.map((e) => e.exercise_id).filter((x): x is string => !!x);
    const statusMap = exerciseStatusForDay(planIds, sessionSets);
    todayExerciseLines = planExercises.map((e) => ({
      name: e.name,
      status: e.exercise_id ? (statusMap[e.exercise_id] ?? 'missed') : 'missed',
    }));
  }
  const todayDateLabel = new Date(todayISO + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
```

- [ ] **Step 4: Renderizar la celebración cuando `todayDone`**

Reemplaza el contenido de la tarjeta "Hoy te toca" (líneas 69-104, el `<Card>` que contiene `CardTitle "Hoy te toca"`) por:

```tsx
        <Card>
          <CardHeader>
            <CardTitle>{todayDone ? 'Tu entrenamiento de hoy' : 'Hoy te toca'}</CardTitle>
          </CardHeader>
          <CardBody>
            {calendar.plan ? (
              todayDone && todayPlanDay ? (
                <SessionCompleteCard
                  dateLabel={todayDateLabel}
                  focusLabel={todayPlanDay.focus ?? todayPlanDay.title}
                  streak={streak}
                  exercises={todayExerciseLines}
                  skipped={todayStatus === 'skipped'}
                />
              ) : (
                <div className="space-y-3">
                  {todayPlanDay ? (
                    <>
                      <div className="flex items-center gap-2 text-foreground">
                        <Dumbbell className="size-4 text-primary" />
                        <span className="font-medium">{todayPlanDay.focus ?? todayPlanDay.title}</span>
                      </div>
                      <p className="text-sm text-muted">{calendar.plan.title}</p>
                      <Button asChild variant="secondary" size="sm">
                        <Link href="/student/workout">Ver y registrar</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-foreground">
                        <Moon className="size-4 text-muted" />
                        <span className="font-medium">Hoy descansas</span>
                      </div>
                      <p className="text-sm text-muted">Recupera bien para tu próxima sesión.</p>
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/student/workout">Ver calendario</Link>
                      </Button>
                    </>
                  )}
                </div>
              )
            ) : (
              <p className="text-sm text-muted">Sin plan de entrenamiento activo.</p>
            )}
          </CardBody>
        </Card>
```

- [ ] **Step 5: Verificar tipos y build**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/\(protected\)/student/today/page.tsx app/globals.css
git commit -F- <<'EOF'
feat(today): celebracion de sesion completada en lugar de "Hoy te toca"

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 13: Página de entrenamiento — pasar últimos pesos y series al formulario

**Files:**
- Modify: `app/(protected)/student/workout/page.tsx`

- [ ] **Step 1: Obtener la progresión y pasarla al formulario**

En `app/(protected)/student/workout/page.tsx`, añade el import (después de la línea 5):

```tsx
import { getExerciseProgression } from '@/lib/db/queries/exercise-progression';
```

Después de calcular `plannedDays` (línea 37), añade el cálculo de progresión:

```tsx
  const planExerciseIds = [
    ...new Set(plannedDays.flatMap((d) => d.exercises.map((e) => e.exercise_id).filter((x): x is string => !!x))),
  ];
  const progression = await getExerciseProgression(profile.id, planExerciseIds);
```

- [ ] **Step 2: Pasar las nuevas props a `GuidedWorkoutLogForm`**

Reemplaza la línea 58 (`<GuidedWorkoutLogForm workoutPlanId={content?.plan.id ?? null} days={plannedDays} />`) por:

```tsx
            <GuidedWorkoutLogForm
              workoutPlanId={content?.plan.id ?? null}
              days={plannedDays}
              lastWeightByExercise={progression.lastWeightByExercise}
              seriesByExercise={progression.seriesByExercise}
            />
```

- [ ] **Step 3: Verificar tipos y build**

Run: `npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(protected\)/student/workout/page.tsx
git commit -F- <<'EOF'
feat(workout): pasar ultimo peso y series de progreso al formulario guiado

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 14: Calendario — ✓/✗ por ejercicio en el detalle del día

**Files:**
- Modify: `components/workouts/TrainingCalendar.tsx`

> **Contexto:** `TrainingCalendar` ya recibe `exercisesByDay` y `statusByKey` y permite `canEdit`. Hay que: (a) aceptar `setsByKey`, (b) en el panel de detalle de un día con sesión registrada, pintar cada ejercicio del plan con ✓ (si tiene set completado) o ✗. Lee primero el archivo completo para ubicar el panel de detalle y la firma de props.

- [ ] **Step 1: Leer el componente y ubicar la firma de props + el panel de detalle**

Run: lee `components/workouts/TrainingCalendar.tsx` completo. Identifica (1) el `interface`/tipo de props y dónde se desestructura `exercisesByDay`, `statusByKey`; (2) el bloque JSX que muestra el detalle del día seleccionado (donde hoy se listan los ejercicios y los botones Completado/No hecho).

- [ ] **Step 2: Añadir `setsByKey` a las props**

En la firma de props del componente, añade junto a `statusByKey`:

```tsx
  setsByKey,
```

y en el tipo (interface) de props, junto a `statusByKey: Record<string, ...>`:

```tsx
  setsByKey: Record<string, { exercise_id: string | null; weight_kg: number | null; completed: boolean }[]>;
```

Importa el helper de dominio al inicio del archivo (junto a los demás imports):

```tsx
import { exerciseStatusForDay, type LoggedSet } from '@/domain/workouts/progression';
import { Check, X } from 'lucide-react';
```

(Si `Check`/`X` ya estuvieran importados de `lucide-react`, fusiónalos en el import existente en vez de duplicar.)

- [ ] **Step 3: Derivar y pintar ✓/✗ en el detalle del día seleccionado**

En el panel de detalle, donde se tiene el `planDay` seleccionado y su `dateISO`, calcula el estado por ejercicio y úsalo al listar. Justo antes del listado de ejercicios del día, añade:

```tsx
                {(() => {
                  const k = `${selected.planDay.id}|${selected.dateISO}`;
                  const planEx = exercisesByDay[selected.planDay.id] ?? [];
                  const sessionSets: LoggedSet[] = (setsByKey[k] ?? []).map((s) => ({
                    exercise_id: s.exercise_id,
                    weight_kg: s.weight_kg,
                    completed: s.completed,
                    session_date: selected.dateISO,
                  }));
                  const planIds = planEx.map((e) => e.exercise_id).filter((x): x is string => !!x);
                  const statusMap = exerciseStatusForDay(planIds, sessionSets);
                  const hasSession = (setsByKey[k]?.length ?? 0) > 0;
                  return (
                    <ul className="space-y-1.5">
                      {planEx.map((e, i) => {
                        const st = e.exercise_id ? statusMap[e.exercise_id] : undefined;
                        return (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            {hasSession && st === 'done' ? (
                              <Check className="size-4 text-primary" />
                            ) : hasSession ? (
                              <X className="size-4 text-faint" />
                            ) : (
                              <span className="size-4" />
                            )}
                            <span className={hasSession && st !== 'done' ? 'text-faint' : 'text-foreground'}>
                              {e.name}
                            </span>
                            <span className="ml-auto text-xs text-faint">
                              {e.sets}×{e.reps}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
```

> Sustituye el listado de ejercicios anterior del panel de detalle por este bloque (no dupliques la lista). Conserva los botones de estado (Completado / No hecho) y el `<select>` de día que ya existan.

- [ ] **Step 4: Pasar `setsByKey` desde los consumidores**

`TrainingCalendar` se usa en dos sitios; ambos ya pasan `statusByKey`. Añade `setsByKey={calendar.setsByKey}`:
- `app/(protected)/student/workout/page.tsx` (en el `<TrainingCalendar ... />`, líneas ~76-84).
- `app/(protected)/coach/students/[studentId]/calendar/page.tsx` (donde se renderiza `<TrainingCalendar />`).

- [ ] **Step 5: Verificar tipos y build**

Run: `npm run typecheck && npm run build`
Expected: PASS. Si el build se queja de que falta `setsByKey` en algún `<TrainingCalendar>`, añádelo en ese consumidor.

- [ ] **Step 6: Commit**

```bash
git add components/workouts/TrainingCalendar.tsx app/\(protected\)/student/workout/page.tsx app/\(protected\)/coach/students/\[studentId\]/calendar/page.tsx
git commit -F- <<'EOF'
feat(calendar): detalle del dia con vistos por ejercicio (hecho/no hecho)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 15: Edición de la coach desde el calendario (registrar detalle)

**Files:**
- Modify: `app/(protected)/coach/students/[studentId]/calendar/page.tsx`
- Modify: `components/workouts/TrainingCalendar.tsx` (enganchar la acción de la coach al detalle, solo cuando `canEdit` y es coach)

> **Contexto:** los botones rápidos (Completado / No hecho) ya funcionan vía `toggleSessionStatus` cuando `canEdit`. Esta tarea añade que la coach pueda **registrar el detalle** (pesos/reps por ejercicio) de un día desde el calendario, usando `coachLogStudentSession` (Task 6). Lee primero el archivo de la página del calendario de la coach para ver cómo se pasa `canEdit` y `studentId`.

- [ ] **Step 1: Leer la página del calendario de la coach**

Run: lee `app/(protected)/coach/students/[studentId]/calendar/page.tsx`. Confirma que ya obtiene `getTrainingCalendarData(studentId)` y renderiza `<TrainingCalendar ... canEdit />`. Anota cómo recibe `studentId` (de `params`).

- [ ] **Step 2: Añadir un formulario de detalle de la coach en el panel del día (dentro de TrainingCalendar, gated por una prop `coachEdit`)**

Añade a las props de `TrainingCalendar` una bandera opcional y el plan id:

```tsx
  coachEdit = false,
```

y en el tipo de props:

```tsx
  coachEdit?: boolean;
```

En el panel de detalle, cuando `coachEdit` y haya `plan` y `selected.planDay`, muestra inputs simples (peso/reps por ejercicio del día) y un botón "Guardar por la alumna" que llame a `coachLogStudentSession`. Implementa un sub-componente cliente `CoachDayLogger` en el mismo archivo:

```tsx
function CoachDayLogger({
  studentId,
  planId,
  planDayId,
  dateISO,
  exercises,
  onDone,
}: {
  studentId: string;
  planId: string | null;
  planDayId: string;
  dateISO: string;
  exercises: { exercise_id: string | null; name: string; sets: number; reps: string }[];
  onDone: () => void;
}) {
  const [rows, setRows] = useState(
    exercises.map((e) => ({ exerciseId: e.exercise_id, name: e.name, weight: '', reps: e.reps.match(/\d+/)?.[0] ?? '' })),
  );
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function save() {
    setErr(null);
    const sets = rows.map((r, i) => ({
      exerciseId: r.exerciseId,
      setNumber: i + 1,
      reps: r.reps ? Number(r.reps) : null,
      weight: r.weight ? Number(r.weight) : null,
      completed: true,
    }));
    start(async () => {
      const res = await coachLogStudentSession({ studentId, planId, planDayId, dateISO, sets });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onDone();
    });
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-hairline p-3">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="flex-1 truncate text-sm text-foreground">{r.name}</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="reps"
            value={r.reps}
            onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))}
            className="h-9 w-16 rounded-md border border-border bg-canvas px-2 text-sm"
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={r.weight}
            onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))}
            className="h-9 w-16 rounded-md border border-border bg-canvas px-2 text-sm"
          />
        </div>
      ))}
      {err && <p className="text-sm text-danger">{err}</p>}
      <Button onClick={save} loading={pending} size="sm" variant="secondary" className="w-full">
        Guardar por la alumna
      </Button>
    </div>
  );
}
```

Añade los imports necesarios al inicio del archivo: `import { coachLogStudentSession } from '@/lib/coach/actions';` y asegúrate de que `useState`, `useTransition` y `Button` estén importados.

En el panel de detalle, donde se muestran los botones de estado, añade (gated):

```tsx
                {coachEdit && plan && (
                  <CoachDayLogger
                    studentId={studentId}
                    planId={plan.id}
                    planDayId={selected.planDay.id}
                    dateISO={selected.dateISO}
                    exercises={exercisesByDay[selected.planDay.id] ?? []}
                    onDone={() => router.refresh()}
                  />
                )}
```

(Si el componente no tiene `router`, añade `const router = useRouter();` con `import { useRouter } from 'next/navigation';`.)

- [ ] **Step 3: Activar `coachEdit` en la página de la coach**

En `app/(protected)/coach/students/[studentId]/calendar/page.tsx`, en el `<TrainingCalendar ... />`, añade `coachEdit` (además del `canEdit` y `setsByKey` ya añadidos):

```tsx
            coachEdit
```

- [ ] **Step 4: Verificar tipos y build**

Run: `npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/workouts/TrainingCalendar.tsx app/\(protected\)/coach/students/\[studentId\]/calendar/page.tsx
git commit -F- <<'EOF'
feat(coach): registrar el detalle de la sesion de una alumna desde el calendario

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

---

## Task 16: Verificación final completa + prueba manual

**Files:** (ninguno nuevo; verificación end-to-end)

- [ ] **Step 1: Suite completa**

Run en orden:
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
Expected: los cuatro en verde (lint sin errores, typecheck sin errores, todos los tests Vitest pasan incluyendo `progression` y `streak`, build exitoso).

- [ ] **Step 2: Prueba manual E2E (local, `npm run dev`)**

Como alumna:
1. Ir a `/student/workout`, registrar la sesión de hoy (marcar ejercicios "Hecha", poner pesos), Guardar.
2. Confirmar redirección a `/student/today` y que aparece la **celebración (anillo + racha + ✓/✗)** en lugar de "Hoy te toca".
3. En `/student/workout`, abrir el calendario, seleccionar el día de hoy: ver ✓/✗ por ejercicio.
4. Tocar "Progreso" en un ejercicio del formulario: ver el mini-gráfico (tras 2+ sesiones, la barra sube).
5. Volver a abrir el ejercicio: el peso viene precargado con el último usado.

Como coach (otra sesión / usuario coach):
6. Ir a `/coach/students/[id]/calendar`, seleccionar un día, usar "Guardar por la alumna" con pesos: confirmar que se guarda y que la alumna lo ve.

Expected: "Hoy te toca" ya no reaparece tras completar; el calendario refleja lo registrado; la tendencia sube; la coach puede registrar.

- [ ] **Step 3: Commit final (si quedaron ajustes de la prueba manual)**

```bash
git add -A
git commit -F- <<'EOF'
test(workouts): verificacion E2E del flujo de completado + progresion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
```

- [ ] **Step 4: Push y deploy**

```bash
git push origin main
```
Luego desplegar a Vercel (ver `OPERATIONS.local.md` para el comando exacto):
`vercel deploy --prod --scope eve-fit-method --token <VERCEL_TOKEN>`

---

## Self-Review (cobertura del spec)

- **Una sola fuente de verdad / `session_date` siempre:** Tasks 4, 5, 6 (helper + logWorkout + coach).
- **Calendario ✓/✗ por ejercicio:** Tasks 7 (datos), 14 (UI).
- **"Hoy te toca" → celebración (anillo + racha + ✓/✗):** Tasks 9, 12 (+ streak Task 3).
- **Prefill último peso + sugerido + tendencia:** Tasks 8, 11, 13.
- **Progresión peso máximo (gráfico):** Tasks 2, 8, 10, 11.
- **Coach control total (marcar día + editar detalle):** botones rápidos ya existen (`toggleSessionStatus`); detalle en Tasks 6, 15.
- **Racha definida (descansos no rompen, sesión pasada sin hacer sí):** Task 3.
- **Día pasado sin registrar = neutro:** Task 14 (sin icono cuando `!hasSession`).
- **Sin tablas nuevas; índice + backfill idempotente:** Task 1.
- **Verificación:** Task 16 (lint/typecheck/test/build + E2E).

Sin placeholders. Tipos consistentes: `LoggedSet`/`MaxWeightPoint` definidos en Task 2 y reusados en Tasks 8, 10, 11, 12, 14; `upsertWorkoutSession` definido en Task 4 y usado en Tasks 5, 6; `SessionExerciseLine` definido en Task 9 y usado en Task 12.
