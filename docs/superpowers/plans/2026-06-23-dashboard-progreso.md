# Dashboard de Progreso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Renovar `/student/progress` (y el progreso del coach) como un dashboard animado que resume peso (con meta), medidas, entrenamiento y nutrición, con gráficos SVG propios.

**Architecture:** Una query agregadora `getStudentProgressDashboard` reúne datos de peso/medidas + reutiliza los helpers de A (calendario/progresión/racha) y B (rango de nutrición/adherencia). Cálculos puros (meta) en `domain/progress/goals.ts` (Vitest). UI con componentes SVG animados (CSS, reduced-motion).

**Tech Stack:** Next.js 16, React 19, TS strict (`noUncheckedIndexedAccess`), Supabase, Vitest, Tailwind v4. Sin librería de gráficos.

**Convención TS strict:** índice → `T | undefined`; usa `?.`, `?? fallback`, guardas. **Commits:** uno por tarea, español, sin secretos, con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. PowerShell NO soporta heredoc `<<` (usa Bash tool o `git commit -F <tempfile>`).

---

## Estructura de archivos

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `supabase/migrations/0016_goal_weight.sql` | `goal_weight_kg` en `student_profiles` | Crear |
| `domain/progress/goals.ts` (+ `.test.ts`) | `goalProgressPct`, `remainingToGoal` | Crear |
| `types/database.ts` | `goal_weight_kg` en `StudentProfiles*` | Modificar |
| `lib/student/actions.ts` | `setGoalWeight` | Modificar |
| `lib/db/queries/progress-dashboard.ts` | `getStudentProgressDashboard` | Crear |
| `components/progress/GoalProgressRing.tsx` | anillo de % a la meta | Crear |
| `components/progress/WeightTrendChart.tsx` | línea animada de peso | Crear |
| `components/progress/MeasurementDeltas.tsx` | barras primera vs última medida | Crear |
| `components/progress/TrainingSummaryCard.tsx` | racha + sesiones + top progresión | Crear |
| `components/progress/NutritionAdherenceSummary.tsx` | % días + mini-gráfico | Crear |
| `components/student/ProgressForms.tsx` | form de meta de peso | Modificar |
| `app/(protected)/student/progress/page.tsx` | dashboard (renovado) | Modificar |
| `app/(protected)/coach/students/[studentId]/progress/page.tsx` | dashboard solo lectura | Modificar |
| `app/globals.css` | keyframes de animación de gráficos | Modificar |

---

## Task 1: Migración 0016 (meta de peso)

**Files:** Create `supabase/migrations/0016_goal_weight.sql`

- [ ] **Step 1: Escribir la migración idempotente**

```sql
-- 0016_goal_weight.sql
alter table public.student_profiles add column if not exists goal_weight_kg numeric;
```

- [ ] **Step 2: Aplicar vía Management API** (token/ref en `OPERATIONS.local.md`; no revelarlo; borra cualquier script temporal). Verifica respuesta sin `error`.

- [ ] **Step 3: Commit** — `feat(db): migracion 0016 meta de peso (goal_weight_kg)`.

---

## Task 2: Dominio — goals.ts (% a la meta)

**Files:** Create `domain/progress/goals.ts` + `domain/progress/goals.test.ts`

- [ ] **Step 1: Test que falla**

```typescript
// domain/progress/goals.test.ts
import { describe, it, expect } from 'vitest';
import { goalProgressPct, remainingToGoal } from './goals';

describe('goalProgressPct', () => {
  it('bajando de peso: 80→75 con meta 70 = 50%', () => {
    expect(goalProgressPct(80, 75, 70)).toBe(50);
  });
  it('subiendo de peso: 60→65 con meta 70 = 50%', () => {
    expect(goalProgressPct(60, 65, 70)).toBe(50);
  });
  it('pasarse de la meta capa a 100', () => {
    expect(goalProgressPct(80, 68, 70)).toBe(100);
  });
  it('ir en sentido contrario capa a 0', () => {
    expect(goalProgressPct(80, 82, 70)).toBe(0);
  });
  it('meta igual al inicio = 100', () => {
    expect(goalProgressPct(70, 70, 70)).toBe(100);
  });
  it('faltan datos = null', () => {
    expect(goalProgressPct(null, 75, 70)).toBeNull();
    expect(goalProgressPct(80, 75, null)).toBeNull();
  });
});

describe('remainingToGoal', () => {
  it('kg que faltan (absoluto, 1 decimal)', () => {
    expect(remainingToGoal(75, 70)).toBe(5);
    expect(remainingToGoal(68.4, 70)).toBe(1.6);
  });
  it('null si faltan datos', () => {
    expect(remainingToGoal(null, 70)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y ver fallar** — `npm run test -- goals`. Expected: FAIL.

- [ ] **Step 3: Implementar goals.ts**

```typescript
// domain/progress/goals.ts
/** Avance hacia la meta de peso, 0..100. Maneja bajar y subir de peso. */
export function goalProgressPct(
  firstKg: number | null,
  currentKg: number | null,
  goalKg: number | null,
): number | null {
  if (firstKg == null || currentKg == null || goalKg == null) return null;
  const total = goalKg - firstKg;
  if (total === 0) return 100;
  const done = currentKg - firstKg;
  const pct = (done / total) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** Kg que faltan para la meta (absoluto, 1 decimal). */
export function remainingToGoal(currentKg: number | null, goalKg: number | null): number | null {
  if (currentKg == null || goalKg == null) return null;
  return Math.round(Math.abs(goalKg - currentKg) * 10) / 10;
}
```

- [ ] **Step 4: Correr y ver pasar** — `npm run test -- goals`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(domain): avance hacia la meta de peso`.

---

## Task 3: `setGoalWeight` + tipo de DB

**Files:** Modify `types/database.ts`, `lib/student/actions.ts`

- [ ] **Step 1: Tipo de DB**

En `types/database.ts`, añade `goal_weight_kg: number | null` a `StudentProfilesRow` y `StudentProfilesInsert` (y Update si existe), siguiendo el patrón nullable del archivo.

- [ ] **Step 2: Acción `setGoalWeight`**

En `lib/student/actions.ts`, añade:

```typescript
export async function setGoalWeight(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const student = await requireStudent();
  const raw = formData.get('goal_weight_kg');
  const value = raw === null || String(raw).trim() === '' ? null : Number(raw);
  if (value !== null && (!Number.isFinite(value) || value <= 0 || value > 500)) {
    return { error: 'Ingresa un peso objetivo válido.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('student_profiles')
    .upsert({ user_id: student.id, goal_weight_kg: value }, { onConflict: 'user_id' });
  if (error) return { error: error.message };
  revalidatePath('/student/progress');
  return { success: 'Meta actualizada' };
}
```

(Reusa los imports ya presentes: `requireStudent`, `createClient`, `revalidatePath`, `ActionState`.)

- [ ] **Step 3: Typecheck** — `npm run typecheck`. Expected: PASS.

- [ ] **Step 4: Commit** — `feat(student): accion para fijar la meta de peso`.

---

## Task 4: Query `getStudentProgressDashboard`

**Files:** Create `lib/db/queries/progress-dashboard.ts`

> Reutiliza helpers existentes: `getTrainingCalendarData` (A), `getExerciseProgression` (A), `getStudentNutritionRange` (B), `buildCalendar`/`addDaysISO` (dominio), `currentStreak` (A), `maxWeightSeries` (A), `dayAdherence` (B).

- [ ] **Step 1: Implementar la query**

```typescript
// lib/db/queries/progress-dashboard.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getTrainingCalendarData } from '@/lib/db/queries/training-calendar';
import { getExerciseProgression } from '@/lib/db/queries/exercise-progression';
import { getStudentNutritionRange } from '@/lib/db/queries/student-nutrition';
import { buildCalendar, addDaysISO } from '@/domain/workouts/calendar';
import { currentStreak, type ScheduledSession } from '@/domain/workouts/streak';
import { dayAdherence } from '@/domain/nutrition/adherence';

export interface WeightPoint { dateISO: string; kg: number; }
export interface MeasurementRow {
  recorded_at: string;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  thigh_cm: number | null;
  arm_cm: number | null;
}
export interface TopProgression { name: string; deltaKg: number; }
export interface NutritionPoint { dateISO: string; calories: number; }

export interface ProgressDashboard {
  weight: { series: WeightPoint[]; currentKg: number | null; firstKg: number | null; goalKg: number | null };
  measurements: { first: MeasurementRow | null; last: MeasurementRow | null };
  training: { sessionsLast30: number; streak: number; topProgressions: TopProgression[] };
  nutrition: { pctDaysOk: number; daysLogged: number; points: NutritionPoint[]; targetCalories: number | null };
}

export async function getStudentProgressDashboard(
  studentId: string,
  todayISO: string,
): Promise<ProgressDashboard> {
  const supabase = await createClient();

  const [{ data: weights }, { data: measures }, { data: sp }] = await Promise.all([
    supabase.from('weight_entries').select('weight_kg, recorded_at').eq('student_id', studentId).order('recorded_at', { ascending: true }),
    supabase.from('body_measurements').select('recorded_at, waist_cm, hip_cm, chest_cm, thigh_cm, arm_cm').eq('student_id', studentId).order('recorded_at', { ascending: true }),
    supabase.from('student_profiles').select('goal_weight_kg').eq('user_id', studentId).maybeSingle(),
  ]);

  const series: WeightPoint[] = (weights ?? []).map((w) => ({ dateISO: w.recorded_at, kg: w.weight_kg }));
  const firstKg = series[0]?.kg ?? null;
  const currentKg = series[series.length - 1]?.kg ?? null;
  const measureRows = (measures ?? []) as MeasurementRow[];

  // Entrenamiento (reusa A).
  const cal = await getTrainingCalendarData(studentId);
  let streak = 0;
  let sessionsLast30 = 0;
  let topProgressions: TopProgression[] = [];
  if (cal.plan) {
    const scheduled: ScheduledSession[] = buildCalendar(
      cal.days, cal.plan.starts_at, cal.plan.weeks, cal.plan.starts_at ?? todayISO, todayISO,
    ).filter((d) => d.planDay).map((d) => ({ dateISO: d.dateISO, planDayId: d.planDay!.id }));
    streak = currentStreak(scheduled, cal.statusByKey, todayISO);

    const since = addDaysISO(todayISO, -30);
    for (const [key, status] of Object.entries(cal.statusByKey)) {
      const dateISO = key.split('|')[1];
      if (status === 'completed' && dateISO && dateISO >= since) sessionsLast30 += 1;
    }

    const exMeta = new Map<string, string>();
    for (const list of Object.values(cal.exercisesByDay)) {
      for (const e of list) if (e.exercise_id) exMeta.set(e.exercise_id, e.name);
    }
    const exIds = [...exMeta.keys()];
    const prog = await getExerciseProgression(studentId, exIds);
    topProgressions = exIds
      .map((id) => {
        const s = prog.seriesByExercise[id] ?? [];
        const first = s[0]?.maxKg ?? 0;
        const last = s[s.length - 1]?.maxKg ?? 0;
        return { name: exMeta.get(id) ?? 'Ejercicio', deltaKg: Math.round((last - first) * 10) / 10 };
      })
      .filter((p) => p.deltaKg > 0)
      .sort((a, b) => b.deltaKg - a.deltaKg)
      .slice(0, 3);
  }

  // Nutrición (reusa B).
  const startISO = addDaysISO(todayISO, -13);
  const range = await getStudentNutritionRange(studentId, startISO, todayISO);
  const points: NutritionPoint[] = [];
  let daysLogged = 0;
  let daysOk = 0;
  let cur = startISO;
  while (cur <= todayISO) {
    const t = range.byDate[cur];
    points.push({ dateISO: cur, calories: t?.consumed.calories ?? 0 });
    if (t?.hasLogs) {
      daysLogged += 1;
      if (dayAdherence(t.consumed.calories, range.target.calories, true) === 'cumplido') daysOk += 1;
    }
    cur = addDaysISO(cur, 1);
  }
  const pctDaysOk = daysLogged > 0 ? Math.round((daysOk / daysLogged) * 100) : 0;

  return {
    weight: { series, currentKg, firstKg, goalKg: sp?.goal_weight_kg ?? null },
    measurements: { first: measureRows[0] ?? null, last: measureRows[measureRows.length - 1] ?? null },
    training: { sessionsLast30, streak, topProgressions },
    nutrition: { pctDaysOk, daysLogged, points, targetCalories: range.target.calories },
  };
}
```

- [ ] **Step 2: Typecheck** — `npm run typecheck`. Expected: PASS.

- [ ] **Step 3: Commit** — `feat(queries): dashboard de progreso agregado (peso/medidas/entreno/nutricion)`.

---

## Task 5: Componentes `GoalProgressRing` + `WeightTrendChart`

**Files:** Create `components/progress/GoalProgressRing.tsx`, `components/progress/WeightTrendChart.tsx`; Modify `app/globals.css`

- [ ] **Step 1: Keyframes en globals.css**

Añade al final de `app/globals.css`:

```css
@keyframes efm-bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.efm-bar { transform-origin: bottom; animation: efm-bar-grow 0.6s ease-out both; }
@keyframes efm-line-draw { from { stroke-dashoffset: var(--efm-len); } to { stroke-dashoffset: 0; } }
.efm-line { animation: efm-line-draw 1.1s ease-out 0.1s both; }
@media (prefers-reduced-motion: reduce) {
  .efm-bar { animation: none; transform: none; }
  .efm-line { animation: none; stroke-dashoffset: 0; }
}
```

- [ ] **Step 2: `GoalProgressRing.tsx`**

```tsx
// components/progress/GoalProgressRing.tsx
export function GoalProgressRing({
  pct,
  currentKg,
  goalKg,
  remainingKg,
}: {
  pct: number | null;
  currentKg: number | null;
  goalKg: number | null;
  remainingKg: number | null;
}) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const shown = pct ?? 0;
  const offset = circ * (1 - shown / 100);
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[84px] shrink-0">
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--color-hairline)" strokeWidth="8" />
          {pct != null && (
            <circle
              cx="42" cy="42" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="8" strokeLinecap="round"
              transform="rotate(-90 42 42)" strokeDasharray={circ}
              className="efm-line" style={{ ['--efm-len' as string]: `${offset}`, strokeDashoffset: offset }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="tabular text-lg font-bold text-foreground">{pct != null ? `${pct}%` : '—'}</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted">Avance hacia tu meta</p>
        {goalKg != null ? (
          <>
            <p className="tabular font-semibold text-foreground">{currentKg ?? '—'} kg → {goalKg} kg</p>
            {remainingKg != null && remainingKg > 0 && (
              <p className="text-xs text-muted">Te faltan {remainingKg} kg</p>
            )}
          </>
        ) : (
          <p className="text-xs text-faint">Fija tu peso objetivo abajo para ver tu avance.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `WeightTrendChart.tsx`**

```tsx
// components/progress/WeightTrendChart.tsx
import type { WeightPoint } from '@/lib/db/queries/progress-dashboard';

export function WeightTrendChart({ series, goalKg }: { series: WeightPoint[]; goalKg: number | null }) {
  if (series.length === 0) {
    return <p className="text-xs text-faint">Registra tu peso para ver tu evolución aquí.</p>;
  }
  const W = 300, H = 120, padX = 6, padY = 10;
  const kgs = series.map((p) => p.kg);
  const lo = Math.min(...kgs, goalKg ?? Infinity);
  const hi = Math.max(...kgs, goalKg ?? -Infinity);
  const span = hi - lo || 1;
  const x = (i: number) => padX + (series.length === 1 ? (W - 2 * padX) / 2 : (i * (W - 2 * padX)) / (series.length - 1));
  const y = (kg: number) => padY + (1 - (kg - lo) / span) * (H - 2 * padY);
  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.kg).toFixed(1)}`).join(' ');
  const len = W * 1.6;
  const first = series[0]?.kg ?? 0;
  const last = series[series.length - 1]?.kg ?? 0;
  const delta = Math.round((last - first) * 10) / 10;

  return (
    <div className="space-y-1.5">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución de peso">
        {goalKg != null && (
          <line x1={padX} x2={W - padX} y1={y(goalKg)} y2={y(goalKg)} stroke="var(--color-primary)" strokeWidth="1" strokeDasharray="4 3" opacity={0.6} />
        )}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="efm-line" style={{ ['--efm-len' as string]: `${len}`, strokeDasharray: len, strokeDashoffset: len }} />
        {series.map((p, i) => <circle key={p.dateISO + i} cx={x(i)} cy={y(p.kg)} r="2.5" fill="var(--color-primary)" />)}
      </svg>
      <p className="text-xs text-muted">
        {delta < 0 ? `↘ ${delta} kg` : delta > 0 ? `↗ +${delta} kg` : '→ sin cambio'} desde el inicio
        {goalKg != null ? ' · línea punteada = meta' : ''}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build** — `npm run typecheck && npm run build`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(progress): anillo de meta + grafico de evolucion de peso`.

---

## Task 6: Componentes `MeasurementDeltas` + `TrainingSummaryCard` + `NutritionAdherenceSummary`

**Files:** Create the three under `components/progress/`

- [ ] **Step 1: `MeasurementDeltas.tsx`**

```tsx
// components/progress/MeasurementDeltas.tsx
import type { MeasurementRow } from '@/lib/db/queries/progress-dashboard';

const FIELDS: { key: keyof MeasurementRow; label: string }[] = [
  { key: 'waist_cm', label: 'Cintura' },
  { key: 'hip_cm', label: 'Cadera' },
  { key: 'chest_cm', label: 'Pecho' },
  { key: 'thigh_cm', label: 'Muslo' },
  { key: 'arm_cm', label: 'Brazo' },
];

export function MeasurementDeltas({ first, last }: { first: MeasurementRow | null; last: MeasurementRow | null }) {
  if (!last) return <p className="text-xs text-faint">Registra tus medidas para ver tu evolución.</p>;
  return (
    <ul className="space-y-2">
      {FIELDS.map(({ key, label }) => {
        const lastV = last[key] as number | null;
        if (lastV == null) return null;
        const firstV = (first?.[key] as number | null) ?? null;
        const delta = firstV != null ? Math.round((lastV - firstV) * 10) / 10 : null;
        return (
          <li key={String(key)} className="flex items-center justify-between text-sm">
            <span className="text-muted">{label}</span>
            <span className="tabular text-foreground">
              {lastV} cm
              {delta != null && delta !== 0 && (
                <span className={delta < 0 ? 'ml-2 text-success' : 'ml-2 text-warning'}>
                  {delta < 0 ? '↘' : '↗'} {Math.abs(delta)} cm
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: `TrainingSummaryCard.tsx`**

```tsx
// components/progress/TrainingSummaryCard.tsx
import { Flame } from 'lucide-react';
import type { TopProgression } from '@/lib/db/queries/progress-dashboard';

export function TrainingSummaryCard({
  sessionsLast30,
  streak,
  topProgressions,
}: {
  sessionsLast30: number;
  streak: number;
  topProgressions: TopProgression[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-6">
        <div>
          <p className="tabular text-2xl font-bold text-foreground">{sessionsLast30}</p>
          <p className="text-xs text-muted">sesiones (30 días)</p>
        </div>
        <div>
          <p className="tabular flex items-center gap-1 text-2xl font-bold text-foreground">
            <Flame className="size-5 text-primary" /> {streak}
          </p>
          <p className="text-xs text-muted">racha</p>
        </div>
      </div>
      {topProgressions.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Más progreso</p>
          <ul className="space-y-1">
            {topProgressions.map((p) => (
              <li key={p.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{p.name}</span>
                <span className="tabular text-success">↗ +{p.deltaKg} kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `NutritionAdherenceSummary.tsx`** (reusa el chart de B)

```tsx
// components/progress/NutritionAdherenceSummary.tsx
import { NutritionAdherenceChart } from '@/components/nutrition/NutritionAdherenceChart';
import type { NutritionPoint } from '@/lib/db/queries/progress-dashboard';

export function NutritionAdherenceSummary({
  pctDaysOk,
  daysLogged,
  points,
  targetCalories,
}: {
  pctDaysOk: number;
  daysLogged: number;
  points: NutritionPoint[];
  targetCalories: number | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="tabular text-2xl font-bold text-foreground">{pctDaysOk}%</span>
        <span className="text-xs text-muted">días en meta ({daysLogged} con registro)</span>
      </div>
      <NutritionAdherenceChart points={points} target={targetCalories} />
    </div>
  );
}
```

> Nota: `NutritionAdherenceChart` (de B) espera `points: {dateISO, calories}[]`; `NutritionPoint` tiene esa forma. Si TS se queja por nominalidad, mapea `points.map((p) => ({ dateISO: p.dateISO, calories: p.calories }))` al pasarlos.

- [ ] **Step 4: Typecheck + build** — `npm run typecheck && npm run build`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(progress): medidas, resumen de entrenamiento y nutricion`.

---

## Task 7: Renovar la página de progreso de la alumna + form de meta

**Files:** Modify `components/student/ProgressForms.tsx`, `app/(protected)/student/progress/page.tsx`

- [ ] **Step 1: Form de meta de peso**

En `components/student/ProgressForms.tsx`, añade un componente nuevo (al final), e importa `setGoalWeight`:

```tsx
import { addMeasurement, addWeight, setGoalWeight } from '@/lib/student/actions';

export function GoalWeightForm({ current }: { current: number | null }) {
  const [state, action] = useActionState(setGoalWeight, initialActionState);
  return (
    <form action={action} className="flex items-end gap-3">
      <FormField label="Peso objetivo (kg)" htmlFor="goal_weight_kg">
        <Input id="goal_weight_kg" name="goal_weight_kg" type="number" step="0.1" inputMode="decimal" defaultValue={current ?? ''} />
      </FormField>
      <SubmitButton size="sm">Guardar meta</SubmitButton>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Renovar `app/(protected)/student/progress/page.tsx`**

READ el archivo actual (ya conoces su estructura). Reescríbelo para:
- Obtener `const todayISO = new Date().toISOString().slice(0,10);` y `const dash = await getStudentProgressDashboard(profile.id, todayISO);`.
- Calcular `const pct = goalProgressPct(dash.weight.firstKg, dash.weight.currentKg, dash.weight.goalKg); const remaining = remainingToGoal(dash.weight.currentKg, dash.weight.goalKg);`.
- Mantener las consultas de fotos (`getProgressPhotos`) y los formularios (`WeightForm`, `MeasurementForm`, `ProgressPhotoUpload`) + el nuevo `GoalWeightForm current={dash.weight.goalKg}`.
- Estructura (Cards, estilo existente):
  1. Hero: `GoalProgressRing` (pct, currentKg, goalKg, remainingKg) + a su lado `TrainingSummaryCard` resumido + `NutritionAdherenceSummary` (pueden ir en un grid de 1-3 columnas).
  2. Card "Evolución de peso": `WeightTrendChart series={dash.weight.series} goalKg={dash.weight.goalKg}`.
  3. Card "Medidas": `MeasurementDeltas first={dash.measurements.first} last={dash.measurements.last}`.
  4. Card "Entrenamiento": `TrainingSummaryCard` (si no lo pusiste en el hero).
  5. Card "Nutrición": `NutritionAdherenceSummary`.
  6. Card "Fotos de progreso" (existente).
  7. Grid de formularios: meta de peso (`GoalWeightForm`), registrar peso (`WeightForm`), registrar medidas (`MeasurementForm`).
- Importa los componentes nuevos de `@/components/progress/*` y las funciones de dominio `goalProgressPct`/`remainingToGoal` de `@/domain/progress/goals`.
- Mantén TS-strict-safe.

- [ ] **Step 3: Typecheck + build** — `npm run typecheck && npm run build`. Expected: PASS.

- [ ] **Step 4: Commit** — `feat(progress): dashboard renovado para la alumna + meta de peso`.

---

## Task 8: Dashboard del coach (solo lectura)

**Files:** Modify `app/(protected)/coach/students/[studentId]/progress/page.tsx`

- [ ] **Step 1: Reescribir la página del coach**

READ el archivo actual. Reescríbelo para que, tras `assertCoachOwnsStudent`, use `getStudentProgressDashboard(studentId, todayISO)` y renderice las MISMAS tarjetas del dashboard de la alumna (hero con `GoalProgressRing` + `TrainingSummaryCard` + `NutritionAdherenceSummary`, `WeightTrendChart`, `MeasurementDeltas`, fotos), **sin formularios** (solo lectura). Mantén el link "Volver a la alumna" y el `PageHeader`.

- [ ] **Step 2: Typecheck + build** — `npm run typecheck && npm run build`. Expected: PASS.

- [ ] **Step 3: Commit** — `feat(progress): dashboard de progreso de la alumna en vista del coach`.

---

## Task 9: Verificación final + deploy

- [ ] **Step 1: Suite** — `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (los cuatro verdes; incluye `goals`).
- [ ] **Step 2: Prueba manual** (local): fijar meta → ver anillo de avance; registrar peso → verlo en la línea y el % moverse; ver resumen de entrenamiento (racha/sesiones/top progresión) y nutrición (% días); como coach ver el dashboard de la alumna.
- [ ] **Step 3: Push + deploy** — `git push origin main`; deploy a Vercel (ver `OPERATIONS.local.md`).

---

## Self-Review (cobertura del spec)

- **Dashboard renovado en /student/progress + coach:** Tasks 7, 8.
- **Meta de peso (DB + acción + anillo + form):** Tasks 1, 2, 3, 5, 7.
- **Gráfico de peso animado:** Task 5.
- **Medidas (deltas):** Task 6.
- **Resumen de entrenamiento (racha/sesiones/top progresión, reusa A):** Tasks 4, 6.
- **Resumen de nutrición (% días, reusa B):** Tasks 4, 6.
- **SVG animado + reduced-motion:** Tasks 5 (globals.css), 6.
- **Verificación:** Task 9.

Tipos consistentes: `WeightPoint`/`MeasurementRow`/`TopProgression`/`NutritionPoint`/`ProgressDashboard` definidos en Task 4 y reusados en Tasks 5, 6, 7, 8; `goalProgressPct`/`remainingToGoal` (Task 2) en Task 7. Sin placeholders.
