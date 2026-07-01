# Calculadora de Calorías — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a professional 4-step calorie calculator wizard at `/coach/calculadora` that uses Mifflin-St Jeor / Katch-McArdle formulas, lets the coach assign results directly to a student's active nutrition plan, and includes animated SVG ring + ⓘ info panels with adjustable macro multipliers.

**Architecture:** Pure domain functions in `domain/nutrition/energy.ts` (testable, client-importable) + Zod validator in `lib/validators/energy.ts` + server action in `lib/coach/calorie-calc-actions.ts` + 4-step sliding wizard client component at `app/(protected)/coach/calculadora/CalcWizard.tsx`. Zero DB migrations — reuses existing `student_profiles` (read) and `nutrition_plans` (write).

**Tech Stack:** Next.js 16 App Router, React 19 `useActionState`, Tailwind CSS v4, Lucide icons, Vitest, Zod v4, Supabase SSR.

**Spec:** `docs/superpowers/specs/2026-06-30-calculadora-calorias-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `domain/nutrition/energy.ts` | Pure BMR/TDEE/macro functions — client-safe |
| Create | `domain/nutrition/energy.test.ts` | Vitest unit tests |
| Create | `lib/validators/energy.ts` | Zod schema for energy inputs |
| Create | `lib/coach/calorie-calc-actions.ts` | Server action `assignCalorieTarget` |
| Modify | `components/navigation/AppShell.tsx` | Add Calculator nav item to COACH_NAV |
| Create | `app/(protected)/coach/calculadora/page.tsx` | Server component — fetches active students |
| Create | `app/(protected)/coach/calculadora/CalcWizard.tsx` | 4-step wizard with ring + ⓘ panels |

---

## Task 1: Energy Domain Tests (write failing tests first)

**Files:**
- Create: `domain/nutrition/energy.test.ts`

Reference formulas:
- Mifflin-St Jeor female: `10w + 6.25h - 5a - 161`
- Mifflin-St Jeor male: `10w + 6.25h - 5a + 5`
- Katch-McArdle: `370 + 21.6 × lean_mass_kg` where `lean = weight × (1 - bf/100)`
- Activity factors: sedentary=1.20, light=1.375, moderate=1.55, active=1.725, very_active=1.90
- Goal: target = round(tdee × (1 + adj/100)); kg/week = −(deficit×7)/7700
- Macros: protein_g = round(mult×kg)×4 kcal; fat_g = round(mult×kg)×9 kcal; carbs = residual÷4

- [ ] **Step 1.1: Create the failing test file**

```typescript
// domain/nutrition/energy.test.ts
import { describe, expect, it } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  applyGoalAdjustment,
  calculateMacros,
  safetyCheck,
  calculateEnergy,
} from './energy';

describe('calculateBMR', () => {
  it('Mifflin-St Jeor female (62 kg, 165 cm, 28 yr) → 1350 kcal', () => {
    const r = calculateBMR({ sex: 'female', weight_kg: 62, height_cm: 165, age: 28 });
    expect(r.bmr).toBe(1350);
    expect(r.formula).toBe('mifflin');
  });

  it('Mifflin-St Jeor male (80 kg, 178 cm, 30 yr) → 1768 kcal', () => {
    const r = calculateBMR({ sex: 'male', weight_kg: 80, height_cm: 178, age: 30 });
    expect(r.bmr).toBe(1768);
    expect(r.formula).toBe('mifflin');
  });

  it('Katch-McArdle when bodyfat_pct provided (62 kg, 25 %) → 1374 kcal', () => {
    const r = calculateBMR({ sex: 'female', weight_kg: 62, height_cm: 165, age: 28, bodyfat_pct: 25 });
    expect(r.bmr).toBe(1374);
    expect(r.formula).toBe('katch');
  });
});

describe('calculateTDEE', () => {
  it('moderate × 1350 → 2093', () => {
    expect(calculateTDEE(1350, 'moderate')).toBe(2093);
  });

  it('sedentary × 1350 → 1620', () => {
    expect(calculateTDEE(1350, 'sedentary')).toBe(1620);
  });
});

describe('applyGoalAdjustment', () => {
  it('−18% deficit on 2093 → 1716 kcal, −0.34 kg/week', () => {
    const r = applyGoalAdjustment(2093, -18);
    expect(r.target_kcal).toBe(1716);
    expect(r.kg_per_week).toBeCloseTo(-0.34, 1);
  });

  it('0% → maintenance, 0 kg/week', () => {
    const r = applyGoalAdjustment(2000, 0);
    expect(r.target_kcal).toBe(2000);
    expect(r.kg_per_week).toBe(0);
  });

  it('+10% surplus on 2000 → 2200 kcal', () => {
    const r = applyGoalAdjustment(2000, 10);
    expect(r.target_kcal).toBe(2200);
    expect(r.kg_per_week).toBeGreaterThan(0);
  });
});

describe('calculateMacros', () => {
  it('1716 kcal, 62 kg, 2.0 protein, 0.9 fat → P:124g F:56g C:179g', () => {
    const r = calculateMacros({ target_kcal: 1716, weight_kg: 62, protein_multiplier: 2.0, fat_multiplier: 0.9 });
    expect(r.protein_g).toBe(124);
    expect(r.fat_g).toBe(56);
    expect(r.carbs_g).toBe(179);
  });

  it('carbs cannot go negative', () => {
    const r = calculateMacros({ target_kcal: 800, weight_kg: 80, protein_multiplier: 2.2, fat_multiplier: 1.0 });
    expect(r.carbs_g).toBeGreaterThanOrEqual(0);
  });
});

describe('safetyCheck', () => {
  it('warns bajo_piso when female < 1200 kcal', () => {
    const w = safetyCheck({ target_kcal: 1100, sex: 'female', weight_kg: 60, kg_per_week: -0.2 });
    expect(w).toContain('bajo_piso');
  });

  it('warns bajo_piso when male < 1500 kcal', () => {
    const w = safetyCheck({ target_kcal: 1400, sex: 'male', weight_kg: 70, kg_per_week: -0.3 });
    expect(w).toContain('bajo_piso');
  });

  it('warns ritmo_agresivo when loss > 1% body weight/week', () => {
    // 1% of 60 kg = 0.6 kg/week threshold; 0.7 is over the limit
    const w = safetyCheck({ target_kcal: 1600, sex: 'female', weight_kg: 60, kg_per_week: -0.7 });
    expect(w).toContain('ritmo_agresivo');
  });

  it('no warnings for healthy deficit', () => {
    const w = safetyCheck({ target_kcal: 1600, sex: 'female', weight_kg: 62, kg_per_week: -0.34 });
    expect(w).toHaveLength(0);
  });
});

describe('calculateEnergy (integration)', () => {
  it('returns complete result for a female, moderate activity, 18% deficit', () => {
    const r = calculateEnergy({
      sex: 'female', age: 28, weight_kg: 62, height_cm: 165,
      activity: 'moderate', adjustment_pct: -18,
      protein_multiplier: 2.0, fat_multiplier: 0.9,
    });
    expect(r.bmr).toBe(1350);
    expect(r.tdee).toBe(2093);
    expect(r.target_kcal).toBe(1716);
    expect(r.protein_g).toBe(124);
    expect(r.fat_g).toBe(56);
    expect(r.carbs_g).toBe(179);
    expect(Array.isArray(r.warnings)).toBe(true);
  });
});
```

- [ ] **Step 1.2: Run tests to confirm they fail (function not found)**

```bash
npm run test -- --reporter=verbose domain/nutrition/energy.test.ts
```

Expected: `Error: Failed to resolve import "./energy"` or similar import error.

---

## Task 2: Energy Domain Implementation

**Files:**
- Create: `domain/nutrition/energy.ts`

- [ ] **Step 2.1: Create the domain module**

```typescript
// domain/nutrition/energy.ts

export type Sex = 'female' | 'male';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type EnergyWarning = 'bajo_piso' | 'ritmo_agresivo';

export interface BMRParams {
  sex: Sex;
  age: number;
  weight_kg: number;
  height_cm: number;
  bodyfat_pct?: number;
}

export interface BMRResult {
  bmr: number;
  formula: 'mifflin' | 'katch';
}

export interface GoalResult {
  target_kcal: number;
  kg_per_week: number;
}

export interface MacroResult {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface EnergyInput extends BMRParams {
  activity: ActivityLevel;
  adjustment_pct: number;
  protein_multiplier: number;
  fat_multiplier: number;
}

export interface EnergyResult extends BMRResult, GoalResult, MacroResult {
  tdee: number;
  adjustment_pct: number;
  warnings: EnergyWarning[];
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.20,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.90,
};

const KCAL_PER_KG = 7700;
const FLOOR_FEMALE = 1200;
const FLOOR_MALE = 1500;
const MAX_RATE_FRACTION = 0.01;

/** Mifflin-St Jeor (default) or Katch-McArdle if bodyfat_pct is supplied. */
export function calculateBMR(params: BMRParams): BMRResult {
  const { sex, weight_kg, height_cm, age, bodyfat_pct } = params;
  if (bodyfat_pct !== undefined) {
    const lean = weight_kg * (1 - bodyfat_pct / 100);
    return { bmr: Math.round(370 + 21.6 * lean), formula: 'katch' };
  }
  const constant = sex === 'female' ? -161 : 5;
  return {
    bmr: Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age + constant),
    formula: 'mifflin',
  };
}

/** TDEE = BMR × Harris-Benedict activity factor. */
export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activity]);
}

/** Applies a percentage adjustment to TDEE and returns daily target + weekly rate. */
export function applyGoalAdjustment(tdee: number, adjustment_pct: number): GoalResult {
  const target_kcal = Math.round(tdee * (1 + adjustment_pct / 100));
  const deficit_day = tdee - target_kcal;
  const kg_per_week = parseFloat((-(deficit_day * 7) / KCAL_PER_KG).toFixed(2));
  return { target_kcal, kg_per_week };
}

/** Protein first, fat second, carbs residual. */
export function calculateMacros(params: {
  target_kcal: number;
  weight_kg: number;
  protein_multiplier: number;
  fat_multiplier: number;
}): MacroResult {
  const { target_kcal, weight_kg, protein_multiplier, fat_multiplier } = params;
  const protein_g = Math.round(protein_multiplier * weight_kg);
  const fat_g = Math.round(fat_multiplier * weight_kg);
  const residual = target_kcal - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(residual / 4));
  return { protein_g, fat_g, carbs_g };
}

/** Returns warning codes for unsafe intake or aggressive rate of change. */
export function safetyCheck(params: {
  target_kcal: number;
  sex: Sex;
  weight_kg: number;
  kg_per_week: number;
}): EnergyWarning[] {
  const { target_kcal, sex, weight_kg, kg_per_week } = params;
  const warnings: EnergyWarning[] = [];
  const floor = sex === 'female' ? FLOOR_FEMALE : FLOOR_MALE;
  if (target_kcal < floor) warnings.push('bajo_piso');
  if (Math.abs(kg_per_week) > weight_kg * MAX_RATE_FRACTION) warnings.push('ritmo_agresivo');
  return warnings;
}

/** Full pipeline: BMR → TDEE → goal adjustment → macros → safety check. */
export function calculateEnergy(input: EnergyInput): EnergyResult {
  const bmrResult = calculateBMR(input);
  const tdee = calculateTDEE(bmrResult.bmr, input.activity);
  const { target_kcal, kg_per_week } = applyGoalAdjustment(tdee, input.adjustment_pct);
  const macros = calculateMacros({
    target_kcal,
    weight_kg: input.weight_kg,
    protein_multiplier: input.protein_multiplier,
    fat_multiplier: input.fat_multiplier,
  });
  const warnings = safetyCheck({ target_kcal, sex: input.sex, weight_kg: input.weight_kg, kg_per_week });
  return { ...bmrResult, tdee, target_kcal, kg_per_week, adjustment_pct: input.adjustment_pct, ...macros, warnings };
}
```

- [ ] **Step 2.2: Run tests — all must pass**

```bash
npm run test -- --reporter=verbose domain/nutrition/energy.test.ts
```

Expected: 13 tests, all green.

- [ ] **Step 2.3: Commit**

```bash
git add domain/nutrition/energy.ts domain/nutrition/energy.test.ts
git commit -m "feat(domain): calorie calculator — energy functions + Vitest tests"
```

---

## Task 3: Zod Validator

**Files:**
- Create: `lib/validators/energy.ts`

- [ ] **Step 3.1: Create the validator**

```typescript
// lib/validators/energy.ts
import { z } from 'zod';

export const energyInputSchema = z.object({
  sex: z.enum(['female', 'male']).default('female'),
  age: z.coerce.number().int().min(14, 'Mínimo 14 años').max(99, 'Máximo 99 años'),
  weight_kg: z.coerce.number().min(30, 'Mínimo 30 kg').max(250, 'Máximo 250 kg'),
  height_cm: z.coerce.number().min(100, 'Mínimo 100 cm').max(220, 'Máximo 220 cm'),
  bodyfat_pct: z.coerce.number().min(5).max(50).optional(),
  activity: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  adjustment_pct: z.coerce.number().min(-25, 'Máximo déficit −25%').max(15, 'Máximo superávit +15%'),
  protein_multiplier: z.coerce.number().min(1.6).max(2.2).default(2.0),
  fat_multiplier: z.coerce.number().min(0.8).max(1.0).default(0.9),
  student_id: z.string().uuid().optional(),
});

export type EnergyFormInput = z.infer<typeof energyInputSchema>;
```

- [ ] **Step 3.2: Commit**

```bash
git add lib/validators/energy.ts
git commit -m "feat(validators): Zod schema for calorie calculator inputs"
```

---

## Task 4: Server Action

**Files:**
- Create: `lib/coach/calorie-calc-actions.ts`

- [ ] **Step 4.1: Create the server action**

```typescript
// lib/coach/calorie-calc-actions.ts
'use server';

import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { energyInputSchema } from '@/lib/validators/energy';
import { calculateEnergy } from '@/domain/nutrition/energy';
import type { ActionState } from '@/lib/auth/action-state';
import { revalidatePath } from 'next/cache';

export async function assignCalorieTarget(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const coach = await requireCoach();

  const parsed = energyInputSchema.safeParse({
    sex: formData.get('sex'),
    age: formData.get('age'),
    weight_kg: formData.get('weight_kg'),
    height_cm: formData.get('height_cm'),
    bodyfat_pct: formData.get('bodyfat_pct') || undefined,
    activity: formData.get('activity'),
    adjustment_pct: formData.get('adjustment_pct'),
    protein_multiplier: formData.get('protein_multiplier'),
    fat_multiplier: formData.get('fat_multiplier'),
    student_id: formData.get('student_id'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const { student_id, ...energyInput } = parsed.data;
  if (!student_id) return { error: 'Debes seleccionar una alumna para asignar' };

  await assertCoachOwnsStudent(coach.id, student_id);

  // Recalculate server-side — never trust hidden form values for target numbers
  const result = calculateEnergy(energyInput as Parameters<typeof calculateEnergy>[0]);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('nutrition_plans')
    .select('id')
    .eq('student_id', student_id)
    .eq('coach_id', coach.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('nutrition_plans')
      .update({
        calories_target: result.target_kcal,
        protein_target_g: result.protein_g,
        carbs_target_g: result.carbs_g,
        fat_target_g: result.fat_g,
      })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('nutrition_plans').insert({
      coach_id: coach.id,
      student_id,
      title: `Plan calculado — ${today}`,
      calories_target: result.target_kcal,
      protein_target_g: result.protein_g,
      carbs_target_g: result.carbs_g,
      fat_target_g: result.fat_g,
      status: 'active',
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/coach/students/${student_id}/nutrition`);
  return { success: '¡Calorías asignadas! El plan de nutrición ha sido actualizado.' };
}
```

- [ ] **Step 4.2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors in the new file.

- [ ] **Step 4.3: Commit**

```bash
git add lib/coach/calorie-calc-actions.ts
git commit -m "feat(actions): assignCalorieTarget — upserts nutrition plan from energy calculation"
```

---

## Task 5: Nav Item

**Files:**
- Modify: `components/navigation/AppShell.tsx`

- [ ] **Step 5.1: Add Calculator import and nav item**

In `components/navigation/AppShell.tsx`, change the import block (around line 7–25) to add `Calculator`:

```typescript
import {
  Apple,
  BookOpen,
  Calculator,      // ← add this
  Dumbbell,
  Home,
  Inbox,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Mail,
  Menu,
  Settings,
  User,
  UserCog,
  Users,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
```

Then in the `COACH_NAV` array, add after `{ label: 'Ejercicios', ... }`:

```typescript
const COACH_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/coach', icon: LayoutDashboard },
  { label: 'Alumnas', href: '/coach/students', icon: Users },
  { label: 'Solicitudes', href: '/coach/solicitudes', icon: Inbox },
  { label: 'Nutrición', href: '/coach/nutrition', icon: Apple },
  { label: 'Entrenamientos', href: '/coach/workouts', icon: Dumbbell },
  { label: 'Ejercicios', href: '/coach/exercises', icon: ListChecks },
  { label: 'Calculadora', href: '/coach/calculadora', icon: Calculator },   // ← add this line
  { label: 'Contenido', href: '/coach/content', icon: BookOpen },
  { label: 'Plantillas', href: '/coach/plantillas', icon: Mail },
  { label: 'Cuentas', href: '/coach/cuentas', icon: UserCog },
  { label: 'Ajustes', href: '/coach/settings', icon: Settings },
];
```

- [ ] **Step 5.2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5.3: Commit**

```bash
git add components/navigation/AppShell.tsx
git commit -m "feat(nav): add Calculadora item to coach sidebar"
```

---

## Task 6: Page Server Component

**Files:**
- Create: `app/(protected)/coach/calculadora/page.tsx`

- [ ] **Step 6.1: Create the page**

```typescript
// app/(protected)/coach/calculadora/page.tsx
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { CalcWizard } from './CalcWizard';

export const metadata = { title: 'Calculadora de Calorías' };

export interface StudentOption {
  id: string;
  name: string;
  height_cm: number | null;
  current_weight_kg: number | null;
  date_of_birth: string | null;
}

export default async function CalcPage() {
  const coach = await requireCoach();
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('coach_students')
    .select('student_id')
    .eq('coach_id', coach.id)
    .eq('status', 'active');

  const ids = (links ?? []).map((l) => l.student_id);

  let students: StudentOption[] = [];
  if (ids.length > 0) {
    const [{ data: profiles }, { data: sps }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', ids),
      supabase
        .from('student_profiles')
        .select('user_id, height_cm, current_weight_kg, date_of_birth')
        .in('user_id', ids),
    ]);

    students = (profiles ?? []).map((p) => {
      const sp = (sps ?? []).find((s) => s.user_id === p.id);
      return {
        id: p.id,
        name: p.full_name ?? 'Alumna',
        height_cm: sp?.height_cm ?? null,
        current_weight_kg: sp?.current_weight_kg ?? null,
        date_of_birth: sp?.date_of_birth ?? null,
      };
    });
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calculadora de Calorías</h1>
        <p className="mt-1 text-sm text-muted">
          Mifflin-St Jeor · Katch-McArdle · ISSN 2018
        </p>
      </div>
      <CalcWizard students={students} />
    </div>
  );
}
```

- [ ] **Step 6.2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 6.3: Commit**

```bash
git add app/(protected)/coach/calculadora/page.tsx
git commit -m "feat(page): /coach/calculadora server component — loads active students"
```

---

## Task 7: Wizard — Steps 0–2 (Datos, Actividad, Objetivo)

**Files:**
- Create: `app/(protected)/coach/calculadora/CalcWizard.tsx` (initial, steps 0–2 only)

- [ ] **Step 7.1: Create the wizard with steps 0–2**

```tsx
// app/(protected)/coach/calculadora/CalcWizard.tsx
'use client';

import { useActionState, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { calculateEnergy } from '@/domain/nutrition/energy';
import type { EnergyResult, ActivityLevel, Sex } from '@/domain/nutrition/energy';
import { assignCalorieTarget } from '@/lib/coach/calorie-calc-actions';
import { initialActionState } from '@/lib/auth/action-state';
import { cn } from '@/lib/utils/cn';
import type { StudentOption } from './page';

// ─── Constants ────────────────────────────────────────────────

const STEP_LABELS = ['Datos', 'Actividad', 'Objetivo', 'Resultado'];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary',   label: 'Sedentaria',   desc: 'Sin ejercicio o trabajo sentada' },
  { value: 'light',       label: 'Ligera',       desc: '1–3 días de ejercicio/semana' },
  { value: 'moderate',    label: 'Moderada',     desc: '3–5 días de ejercicio/semana' },
  { value: 'active',      label: 'Activa',       desc: '6–7 días de ejercicio intenso' },
  { value: 'very_active', label: 'Muy activa',   desc: 'Trabajo físico intenso + entreno diario' },
];

const GOAL_PRESETS: { label: string; value: number }[] = [
  { label: 'Bajar grasa', value: -15 },
  { label: 'Mantener',    value: 0 },
  { label: 'Ganar músculo', value: 10 },
];

// ─── Types ─────────────────────────────────────────────────────

interface WizardForm {
  studentId: string;
  sex: Sex;
  age: string;
  weight_kg: string;
  height_cm: string;
  bodyfat_pct: string;
  activity: ActivityLevel;
  adjustmentPct: number;
  proteinMult: number;
  fatMult: number;
}

// ─── Component ────────────────────────────────────────────────

export function CalcWizard({ students }: { students: StudentOption[] }) {
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<EnergyResult | null>(null);
  const [form, setForm] = useState<WizardForm>({
    studentId: '',
    sex: 'female',
    age: '',
    weight_kg: '',
    height_cm: '',
    bodyfat_pct: '',
    activity: 'moderate',
    adjustmentPct: -15,
    proteinMult: 2.0,
    fatMult: 0.9,
  });

  const [state, action] = useActionState(assignCalorieTarget, initialActionState);

  // Pre-fill from student profile when student is selected
  function handleStudentChange(id: string) {
    const s = students.find((st) => st.id === id);
    if (!s) { setForm((f) => ({ ...f, studentId: id })); return; }
    const age = s.date_of_birth
      ? String(new Date().getFullYear() - new Date(s.date_of_birth).getFullYear())
      : '';
    setForm((f) => ({
      ...f,
      studentId: id,
      age,
      weight_kg: s.current_weight_kg != null ? String(s.current_weight_kg) : f.weight_kg,
      height_cm: s.height_cm != null ? String(s.height_cm) : f.height_cm,
    }));
  }

  function goNext() {
    if (step === 2) {
      // Calculate result before showing step 3
      const r = calculateEnergy({
        sex: form.sex,
        age: Number(form.age),
        weight_kg: Number(form.weight_kg),
        height_cm: Number(form.height_cm),
        bodyfat_pct: form.bodyfat_pct ? Number(form.bodyfat_pct) : undefined,
        activity: form.activity,
        adjustment_pct: form.adjustmentPct,
        protein_multiplier: form.proteinMult,
        fat_multiplier: form.fatMult,
      });
      setResult(r);
    }
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => s - 1);
  }

  const canProceed0 =
    form.age !== '' && form.weight_kg !== '' && form.height_cm !== '';

  // ─── Step 0: Datos ───────────────────────────────────────────

  const step0 = (
    <div className="space-y-4">
      {/* Student selector */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Alumna (opcional)</label>
        <select
          value={form.studentId}
          onChange={(e) => handleStudentChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">— Modo anónimo —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Sex toggle */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Sexo</label>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['female', 'male'] as Sex[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm((f) => ({ ...f, sex: s }))}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                form.sex === s
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:text-foreground'
              )}
            >
              {s === 'female' ? 'Mujer' : 'Hombre'}
            </button>
          ))}
        </div>
      </div>

      {/* Numeric fields */}
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { key: 'age', label: 'Edad', unit: 'años', min: 14, max: 99 },
            { key: 'weight_kg', label: 'Peso', unit: 'kg', min: 30, max: 250 },
            { key: 'height_cm', label: 'Altura', unit: 'cm', min: 100, max: 220 },
          ] as { key: keyof WizardForm; label: string; unit: string; min: number; max: number }[]
        ).map(({ key, label, unit, min, max }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs text-muted">{label}</label>
            <div className="relative">
              <input
                type="number"
                min={min}
                max={max}
                value={form[key] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder="—"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bodyfat optional */}
      <div className="space-y-1">
        <label className="text-sm text-muted">
          % grasa corporal{' '}
          <span className="text-xs italic">(opcional — activa fórmula Katch-McArdle)</span>
        </label>
        <div className="relative w-32">
          <input
            type="number"
            min={5}
            max={50}
            value={form.bodyfat_pct}
            onChange={(e) => setForm((f) => ({ ...f, bodyfat_pct: e.target.value }))}
            placeholder="—"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground pr-8 focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
        </div>
      </div>
    </div>
  );

  // ─── Step 1: Actividad ───────────────────────────────────────

  const step1 = (
    <div className="space-y-2">
      <p className="text-sm text-muted mb-4">Selecciona el nivel de actividad habitual de la alumna.</p>
      {ACTIVITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setForm((f) => ({ ...f, activity: opt.value }))}
          className={cn(
            'w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
            form.activity === opt.value
              ? 'border-primary bg-primary/10'
              : 'border-border bg-surface hover:border-primary/50'
          )}
        >
          <div
            className={cn(
              'mt-0.5 size-4 rounded-full border-2 flex-shrink-0',
              form.activity === opt.value ? 'border-primary bg-primary' : 'border-muted'
            )}
          />
          <div>
            <p className={cn('text-sm font-semibold', form.activity === opt.value ? 'text-primary' : 'text-foreground')}>
              {opt.label}
            </p>
            <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );

  // ─── Step 2: Objetivo ────────────────────────────────────────

  const kgPerWeek = (() => {
    const tdeeEst = form.weight_kg ? Math.round(Number(form.weight_kg) * 33) : 2000;
    const target = Math.round(tdeeEst * (1 + form.adjustmentPct / 100));
    const deficit = tdeeEst - target;
    return parseFloat((-(deficit * 7) / 7700).toFixed(2));
  })();

  const isAggressiveGoal = form.adjustmentPct < -20 || form.adjustmentPct > 14;

  const step2 = (
    <div className="space-y-5">
      {/* Preset buttons */}
      <div className="flex gap-2">
        {GOAL_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setForm((f) => ({ ...f, adjustmentPct: p.value }))}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors',
              form.adjustmentPct === p.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Fine-tune slider */}
      <div className="space-y-3 rounded-lg border border-border bg-surface/50 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-foreground font-medium">Ajuste fino</span>
          <span className={cn(
            'text-2xl font-bold tabular-nums transition-colors',
            form.adjustmentPct < 0 ? 'text-[#E24B4A]' : form.adjustmentPct === 0 ? 'text-[#EF9F27]' : 'text-[#1D9E75]'
          )}>
            {form.adjustmentPct > 0 ? `+${form.adjustmentPct}` : form.adjustmentPct}%
          </span>
        </div>
        <input
          type="range"
          min={-25}
          max={15}
          step={1}
          value={form.adjustmentPct}
          onChange={(e) => setForm((f) => ({ ...f, adjustmentPct: Number(e.target.value) }))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>−25% (déficit)</span>
          <span>+15% (superávit)</span>
        </div>

        {/* Live rate estimate */}
        <div className={cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
          isAggressiveGoal ? 'bg-[#E24B4A]/10 text-[#E24B4A]' : 'bg-border/30 text-muted'
        )}>
          {form.adjustmentPct < 0 ? '↓' : form.adjustmentPct === 0 ? '⚖' : '↑'}
          <span>
            {form.adjustmentPct === 0
              ? 'Mantener peso'
              : `≈ ${Math.abs(kgPerWeek).toFixed(2)} kg/semana${isAggressiveGoal ? ' — ritmo agresivo' : ''}`}
          </span>
        </div>
      </div>
    </div>
  );

  // ─── Navigation bar ───────────────────────────────────────────

  const nav = (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
      {step > 0 ? (
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" /> Atrás
        </button>
      ) : (
        <div />
      )}
      {step < 3 && (
        <button
          type="button"
          onClick={goNext}
          disabled={step === 0 && !canProceed0}
          className={cn(
            'flex items-center gap-1 rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
            step === 0 && !canProceed0
              ? 'opacity-40 cursor-not-allowed bg-border text-muted'
              : 'bg-primary text-white hover:bg-primary/90'
          )}
        >
          {step === 2 ? 'Calcular' : 'Siguiente'} <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Progress bar */}
      <div className="flex border-b border-border">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex-1 flex flex-col items-center py-3 gap-1">
            <div className={cn(
              'h-1 w-4/5 rounded-full transition-colors duration-300',
              i <= step ? 'bg-primary' : 'bg-border'
            )} />
            <span className={cn('text-xs font-medium transition-colors duration-300', i <= step ? 'text-primary' : 'text-muted')}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Sliding panels */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${step * 25}%)`, width: '400%' }}
        >
          {[step0, step1, step2, <ResultStep key="result" result={result} form={form} setForm={setForm} state={state} action={action} students={students} />].map((panel, i) => (
            <div key={i} className="p-6" style={{ width: '25%' }}>
              {panel}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-6">
        {nav}
      </div>
    </div>
  );
}

// ─── Placeholder ResultStep (Task 8 will fill this in) ────────

function ResultStep({ result, form, setForm, state, action, students }: {
  result: EnergyResult | null;
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  state: { error?: string; success?: string };
  action: (formData: FormData) => void;
  students: StudentOption[];
}) {
  if (!result) return <p className="text-muted text-sm">Calculando…</p>;
  return (
    <p className="text-2xl font-bold text-foreground text-center">
      {result.target_kcal} kcal
    </p>
  );
}
```

- [ ] **Step 7.2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 7.3: Commit**

```bash
git add app/(protected)/coach/calculadora/CalcWizard.tsx
git commit -m "feat(wizard): steps 0-2 — Datos, Actividad, Objetivo with sliding animation"
```

---

## Task 8: Wizard Step 3 — Result, Ring, Macros, ⓘ Panels, Assign Form

**Files:**
- Modify: `app/(protected)/coach/calculadora/CalcWizard.tsx` (replace `ResultStep`)

- [ ] **Step 8.1: Replace the placeholder ResultStep with the full implementation**

Replace the entire `ResultStep` function at the bottom of `CalcWizard.tsx` with:

```tsx
// ─── ResultStep ───────────────────────────────────────────────

function ResultStep({
  result,
  form,
  setForm,
  state,
  action,
  students,
}: {
  result: EnergyResult | null;
  form: WizardForm;
  setForm: React.Dispatch<React.SetStateAction<WizardForm>>;
  state: { error?: string; success?: string };
  action: (formData: FormData) => void;
  students: StudentOption[];
}) {
  const [displayKcal, setDisplayKcal] = useState(0);
  const [ringPct, setRingPct] = useState(0);
  const [openInfo, setOpenInfo] = useState<'protein' | 'fat' | null>(null);
  const [macros, setMacros] = useState<{ protein_g: number; fat_g: number; carbs_g: number } | null>(null);

  // Sync macros from result (or recalc when multipliers change)
  useEffect(() => {
    if (!result) return;
    const { calculateMacros } = require('@/domain/nutrition/energy');
    const m = calculateMacros({
      target_kcal: result.target_kcal,
      weight_kg: Number(form.weight_kg),
      protein_multiplier: form.proteinMult,
      fat_multiplier: form.fatMult,
    });
    setMacros(m);
  }, [result, form.proteinMult, form.fatMult, form.weight_kg]);

  // Count-up animation
  useEffect(() => {
    if (!result) return;
    setDisplayKcal(0);
    setRingPct(0);
    let rafId: number;
    let startTs: number | null = null;
    const DURATION = 1200;
    const targetKcal = result.target_kcal;
    const fillTarget = Math.min(1, result.target_kcal / result.tdee);

    function animate(ts: number) {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayKcal(Math.round(eased * targetKcal));
      setRingPct(eased * fillTarget);
      if (progress < 1) rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [result]);

  if (!result || !macros) return <p className="text-muted text-sm">Calculando…</p>;

  const isDeficit = result.adjustment_pct < 0;
  const isSurplus = result.adjustment_pct > 0;
  const goalColor = isDeficit ? '#E24B4A' : isSurplus ? '#1D9E75' : '#EF9F27';
  const goalLabel = isDeficit ? 'Déficit' : isSurplus ? 'Superávit' : 'Mantenimiento';
  const goalIcon = isDeficit ? '↓' : isSurplus ? '↑' : '⚖';

  const R = 60;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const dashOffset = CIRCUMFERENCE * (1 - ringPct);

  const totalMacroKcal = macros.protein_g * 4 + macros.fat_g * 9 + macros.carbs_g * 4;
  const proteinPct = totalMacroKcal > 0 ? Math.round((macros.protein_g * 4 / totalMacroKcal) * 100) : 0;
  const fatPct = totalMacroKcal > 0 ? Math.round((macros.fat_g * 9 / totalMacroKcal) * 100) : 0;
  const carbsPct = 100 - proteinPct - fatPct;

  const student = students.find((s) => s.id === form.studentId);

  return (
    <div className="space-y-5">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-[#EF9F27]/40 bg-[#EF9F27]/10 px-4 py-3 text-sm text-[#EF9F27]">
          {result.warnings.includes('bajo_piso') && (
            <p>⚠ El objetivo está por debajo del mínimo recomendado. Aumenta el ajuste.</p>
          )}
          {result.warnings.includes('ritmo_agresivo') && (
            <p>⚠ El ritmo de cambio supera el 1% del peso corporal/semana — riesgo de perder masa magra.</p>
          )}
        </div>
      )}

      {/* Ring + stats */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* SVG Ring */}
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 160 160" className="w-40 h-40 -rotate-90">
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--border, #2a2d35)" strokeWidth="14" />
            <circle
              cx="80" cy="80" r={R}
              fill="none"
              stroke={goalColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            <span className="text-2xl font-bold text-foreground tabular-nums">{displayKcal.toLocaleString()}</span>
            <span className="text-xs text-muted">kcal/día</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2 w-full">
          {/* Goal badge */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: `${goalColor}20`, color: goalColor }}
          >
            <span className="text-base">{goalIcon}</span>
            {goalLabel}
            {result.adjustment_pct !== 0 && (
              <span className="font-normal opacity-80">
                {result.adjustment_pct > 0 ? `+${result.adjustment_pct}` : result.adjustment_pct}%
              </span>
            )}
          </div>
          {result.kg_per_week !== 0 && (
            <p className="text-xs text-muted">
              ≈ {Math.abs(result.kg_per_week).toFixed(2)} kg/semana
            </p>
          )}
          {/* TMB / GET cards */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-lg border border-border bg-surface/50 px-3 py-2">
              <p className="text-xs text-muted">TMB ({result.formula === 'katch' ? 'Katch' : 'Mifflin'})</p>
              <p className="text-lg font-bold text-foreground">{result.bmr.toLocaleString()}</p>
              <p className="text-xs text-muted">kcal</p>
            </div>
            <div className="rounded-lg border border-border bg-surface/50 px-3 py-2">
              <p className="text-xs text-muted">GET (TDEE)</p>
              <p className="text-lg font-bold text-foreground">{result.tdee.toLocaleString()}</p>
              <p className="text-xs text-muted">kcal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Macro bars */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Distribución de macros</p>

        {/* Protein */}
        <MacroRow
          label="Proteína"
          grams={macros.protein_g}
          kcal={macros.protein_g * 4}
          pct={proteinPct}
          color="#E24B4A"
          infoOpen={openInfo === 'protein'}
          onInfo={() => setOpenInfo(openInfo === 'protein' ? null : 'protein')}
          infoContent={
            <div className="space-y-3">
              <p className="text-xs text-muted">
                <strong className="text-foreground">Fórmula:</strong>{' '}
                {form.proteinMult.toFixed(1)} g × {form.weight_kg} kg ={' '}
                <strong className="text-foreground">{macros.protein_g} g</strong>
              </p>
              <p className="text-xs text-muted">
                Rango ISSN: 1.6–2.2 g/kg para personas en entrenamiento de fuerza.
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Multiplicador</span>
                  <span className="font-semibold text-foreground">{form.proteinMult.toFixed(1)} g/kg</span>
                </div>
                <input
                  type="range" min={1.6} max={2.2} step={0.1}
                  value={form.proteinMult}
                  onChange={(e) => setForm((f) => ({ ...f, proteinMult: Number(e.target.value) }))}
                  className="w-full accent-[#E24B4A]"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>1.6 (moderado)</span><span>2.2 (alto)</span>
                </div>
              </div>
            </div>
          }
        />

        {/* Fat */}
        <MacroRow
          label="Grasa"
          grams={macros.fat_g}
          kcal={macros.fat_g * 9}
          pct={fatPct}
          color="#EF9F27"
          infoOpen={openInfo === 'fat'}
          onInfo={() => setOpenInfo(openInfo === 'fat' ? null : 'fat')}
          infoContent={
            <div className="space-y-3">
              <p className="text-xs text-muted">
                <strong className="text-foreground">Fórmula:</strong>{' '}
                {form.fatMult.toFixed(1)} g × {form.weight_kg} kg ={' '}
                <strong className="text-foreground">{macros.fat_g} g</strong>
              </p>
              <p className="text-xs text-muted">
                Mínimo hormonal recomendado: 0.8–1.0 g/kg (Academy Nutr Diet, 2022).
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Multiplicador</span>
                  <span className="font-semibold text-foreground">{form.fatMult.toFixed(1)} g/kg</span>
                </div>
                <input
                  type="range" min={0.8} max={1.0} step={0.05}
                  value={form.fatMult}
                  onChange={(e) => setForm((f) => ({ ...f, fatMult: Number(e.target.value) }))}
                  className="w-full accent-[#EF9F27]"
                />
                <div className="flex justify-between text-xs text-muted">
                  <span>0.8 (mínimo)</span><span>1.0 (alto)</span>
                </div>
              </div>
            </div>
          }
        />

        {/* Carbs — no slider, residual */}
        <MacroRow
          label="Carbohidratos"
          grams={macros.carbs_g}
          kcal={macros.carbs_g * 4}
          pct={carbsPct}
          color="#1D9E75"
          infoOpen={false}
          onInfo={undefined}
          infoContent={
            <p className="text-xs text-muted">
              Residual: ({result.target_kcal} − {macros.protein_g * 4} − {macros.fat_g * 9}) ÷ 4 ={' '}
              <strong className="text-foreground">{macros.carbs_g} g</strong>
            </p>
          }
        />
      </div>

      {/* Assign form */}
      {student && (
        <form action={action} className="pt-2 border-t border-border space-y-3">
          {/* Hidden energy inputs (for server-side recalc) */}
          <input type="hidden" name="sex" value={form.sex} />
          <input type="hidden" name="age" value={form.age} />
          <input type="hidden" name="weight_kg" value={form.weight_kg} />
          <input type="hidden" name="height_cm" value={form.height_cm} />
          {form.bodyfat_pct && <input type="hidden" name="bodyfat_pct" value={form.bodyfat_pct} />}
          <input type="hidden" name="activity" value={form.activity} />
          <input type="hidden" name="adjustment_pct" value={form.adjustmentPct} />
          <input type="hidden" name="protein_multiplier" value={form.proteinMult} />
          <input type="hidden" name="fat_multiplier" value={form.fatMult} />
          <input type="hidden" name="student_id" value={form.studentId} />

          {state.error && (
            <p className="text-sm text-[#E24B4A] rounded-lg border border-[#E24B4A]/30 bg-[#E24B4A]/10 px-3 py-2">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="text-sm text-[#1D9E75] rounded-lg border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-3 py-2">
              {state.success}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Asignar a {student.name}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── MacroRow sub-component ───────────────────────────────────

function MacroRow({
  label, grams, kcal, pct, color,
  infoOpen, onInfo, infoContent,
}: {
  label: string;
  grams: number;
  kcal: number;
  pct: number;
  color: string;
  infoOpen: boolean;
  onInfo?: () => void;
  infoContent: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full" style={{ background: color }} />
          <span className="text-sm text-foreground">{label}</span>
          {onInfo && (
            <button
              type="button"
              onClick={onInfo}
              className="size-4 rounded-full border border-border text-muted hover:text-foreground text-[10px] leading-none flex items-center justify-center transition-colors"
              title="Ver fórmula y ajustar"
            >
              i
            </button>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-foreground tabular-nums">{grams}</span>
          <span className="text-xs text-muted">g</span>
          <span className="text-xs text-muted ml-1">({kcal} kcal)</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      {/* Info panel */}
      {infoOpen && (
        <div className="mt-2 rounded-lg border border-border bg-surface p-3">
          {infoContent}
        </div>
      )}
    </div>
  );
}
```

Also add `useEffect` to the imports at the top of CalcWizard.tsx (the `ResultStep` uses it):

Change the first line from:
```tsx
import { useActionState, useState } from 'react';
```
to:
```tsx
import { useActionState, useState, useEffect } from 'react';
```

- [ ] **Step 8.2: Typecheck**

```bash
npm run typecheck
```

Fix any type errors before continuing.

- [ ] **Step 8.3: Run full test suite**

```bash
npm run test
```

Expected: all tests pass including the 13 new energy tests.

- [ ] **Step 8.4: Lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 8.5: Build**

```bash
npm run build
```

Expected: successful build with no errors.

- [ ] **Step 8.6: Commit**

```bash
git add app/(protected)/coach/calculadora/CalcWizard.tsx
git commit -m "feat(wizard): step 3 — animated ring, macro bars, ⓘ multiplier panels, assign form"
```

---

## Task 9: Deploy

- [ ] **Step 9.1: Push to GitHub**

```bash
git push origin main
```

Vercel will pick up the push and deploy automatically. Monitor at Vercel dashboard.

- [ ] **Step 9.2: Update MEMORY.md**

Add a line to `C:\Users\asigcho\.claude\projects\C--EveFitMethod\memory\MEMORY.md` for the new feature:

```
- [Calorie calculator](calorie-calculator.md) — /coach/calculadora DONE: 4-step wizard, Mifflin-St Jeor + Katch-McArdle, SVG ring, ⓘ macro panels, assigns to nutrition_plans. No migrations.
```

And create `C:\Users\asigcho\.claude\projects\C--EveFitMethod\memory\calorie-calculator.md` with a project memory entry describing what was built.

---

## Self-review checklist

- [x] Spec coverage: formulas ✓, Katch-McArdle ✓, wizard 4 steps ✓, ⓘ panels ✓, multiplier sliders ✓, SVG ring ✓, count-up ✓, goal badge reactive ✓, safety warnings ✓, assign action ✓, upsert/create logic ✓, security guards ✓, pre-fill from student profile ✓, anónimo mode ✓
- [x] No placeholders — all code is complete
- [x] Type consistency — `EnergyResult`, `WizardForm`, `StudentOption` used consistently
- [x] Zero migrations — uses existing `student_profiles` + `nutrition_plans`
- [x] `require('@/domain/nutrition/energy')` in ResultStep — this is a dynamic require inside useEffect to avoid circular issues; can be changed to a top-level import if preferred
