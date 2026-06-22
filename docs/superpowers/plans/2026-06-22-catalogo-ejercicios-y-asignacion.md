# Catálogo de ejercicios categorizado + selector visual + splits — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sembrar ~45 ejercicios de gimnasio en español categorizados, dar a la coach un selector visual para elegir varios y configurarlos en lote, y permitir armar planes con splits conocidos (PPL, Arnold, PHUL, etc.) o personalizado, visibles para el alumno.

**Architecture:** Se añaden columnas de categoría a `exercises` y `split_type` a `workout_plans` (migración `0011`), un seed de catálogo (`0012`), constantes canónicas (`lib/constants/`), lógica pura testeada (`domain/`), nuevas server actions de lote, y componentes cliente para el catálogo, el editor y el selector de split. No se rompe nada existente: las páginas y acciones actuales se extienden.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript strict, Tailwind v4, Supabase (Postgres + Storage + RLS), Zod v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-22-catalogo-ejercicios-y-asignacion-design.md`

---

## Convenciones del repo (leer antes de empezar)

- Server actions en `lib/coach/actions.ts`, guardas `requireCoach` / `assertCoachOwnsStudent` desde `@/lib/auth/roles`.
- `ActionState` = `{ error?, success?, fieldErrors? }` desde `@/lib/auth/action-state`; `initialActionState` para `useActionState`.
- Componentes comunes desde `@/components/common`: `Button, SubmitButton, Input, Textarea, FormField, Select, Card, CardHeader, CardTitle, CardBody, Badge, PageHeader, SectionHeader, EmptyState`.
- Cliente Supabase navegador: `import { createClient } from '@/lib/supabase/client'`. Servidor: `@/lib/supabase/server`.
- Subida de imagen: patrón de `components/student/AvatarUpload.tsx` (compress → upload → getPublicUrl).
- Tipos DB en `types/database.ts` (hand-written, mantener en sync). Enums en `types/app.ts`.
- Diseño oscuro "Acero & Escarlata": clases `text-foreground/muted/faint`, `bg-surface/elevated/canvas`, `border-border/hairline`, `text-primary`, `text-danger`.
- Comandos: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Migraciones se aplican manualmente en Supabase; aquí solo se crean los `.sql` en orden.

---

## FASE 1 — Datos y constantes

### Task 1: Constantes canónicas de ejercicios

**Files:**
- Create: `lib/constants/exercises.ts`

- [ ] **Step 1: Crear el archivo de constantes**

```ts
// lib/constants/exercises.ts
// Listas canónicas para categorías de ejercicio. Fuente de verdad de selects,
// chips de filtro, validación Zod y seeds. Mantener en sync con la migración 0011.

export const MUSCLE_GROUPS = [
  'Glúteos',
  'Cuádriceps',
  'Femoral',
  'Espalda',
  'Pecho',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Core',
  'Gemelos',
  'Cuerpo completo',
  'Cardio',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  'Barra',
  'Mancuernas',
  'Máquina',
  'Polea',
  'Peso corporal',
  'Banda elástica',
  'Kettlebell',
  'Smith',
  'Banco',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const DIFFICULTIES = ['principiante', 'intermedio', 'avanzado'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const MOVEMENT_PATTERNS = [
  { value: 'empuje', label: 'Empuje' },
  { value: 'traccion', label: 'Tracción' },
  { value: 'dominante_cadera', label: 'Dominante de cadera' },
  { value: 'dominante_rodilla', label: 'Dominante de rodilla' },
  { value: 'core', label: 'Core' },
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number]['value'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const MOVEMENT_PATTERN_LABEL: Record<MovementPattern, string> = {
  empuje: 'Empuje',
  traccion: 'Tracción',
  dominante_cadera: 'Dominante de cadera',
  dominante_rodilla: 'Dominante de rodilla',
  core: 'Core',
};

/** Color de acento (hex) por grupo muscular para el ícono fallback de la tarjeta. */
export const MUSCLE_GROUP_COLOR: Record<string, string> = {
  'Glúteos': '#FF3B47',
  'Cuádriceps': '#F59E0B',
  'Femoral': '#F97316',
  'Espalda': '#3B82F6',
  'Pecho': '#8B5CF6',
  'Hombros': '#06B6D4',
  'Bíceps': '#10B981',
  'Tríceps': '#14B8A6',
  'Core': '#EAB308',
  'Gemelos': '#A855F7',
  'Cuerpo completo': '#EC4899',
  'Cardio': '#EF4444',
};

export function muscleGroupColor(mg: string | null | undefined): string {
  return (mg && MUSCLE_GROUP_COLOR[mg]) || '#64748B';
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS (sin errores nuevos).

- [ ] **Step 3: Commit**

```bash
git add lib/constants/exercises.ts
git commit -m "feat(exercises): constantes canónicas de categorías de ejercicio"
```

---

### Task 2: Constantes de splits (plantillas)

**Files:**
- Create: `lib/constants/splits.ts`

- [ ] **Step 1: Crear el archivo de plantillas de split**

```ts
// lib/constants/splits.ts
// Plantillas de split: cada una define los días que se generan al crear un plan.
// `muscleGroups` (valores canónicos de MUSCLE_GROUPS) alimenta el pre-filtro del catálogo.

import type { MuscleGroup } from './exercises';

export interface SplitDayTemplate {
  title: string;
  focus: string;
  muscleGroups: MuscleGroup[];
}

export interface SplitTemplate {
  label: string;
  english: string;
  days: SplitDayTemplate[];
}

const PUSH: MuscleGroup[] = ['Pecho', 'Hombros', 'Tríceps'];
const PULL: MuscleGroup[] = ['Espalda', 'Bíceps'];
const LEGS: MuscleGroup[] = ['Cuádriceps', 'Femoral', 'Glúteos', 'Gemelos'];
const UPPER: MuscleGroup[] = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps'];
const LIMBS: MuscleGroup[] = ['Bíceps', 'Tríceps', 'Cuádriceps', 'Femoral', 'Gemelos'];
const FULL: MuscleGroup[] = [];

const d = (title: string, focus: string, muscleGroups: MuscleGroup[]): SplitDayTemplate => ({
  title,
  focus,
  muscleGroups,
});

export const SPLIT_TEMPLATES = {
  cuerpo_completo: {
    label: 'Cuerpo completo',
    english: 'Full Body',
    days: [
      d('Cuerpo completo', 'Todo el cuerpo', FULL),
      d('Cuerpo completo', 'Todo el cuerpo', FULL),
      d('Cuerpo completo', 'Todo el cuerpo', FULL),
    ],
  },
  torso_pierna: {
    label: 'Torso / Pierna',
    english: 'Upper / Lower',
    days: [
      d('Torso', 'Tren superior', UPPER),
      d('Pierna', 'Tren inferior', LEGS),
      d('Torso', 'Tren superior', UPPER),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
  ppl: {
    label: 'Empuje / Tracción / Pierna',
    english: 'PPL',
    days: [d('Empuje', 'Pecho · Hombros · Tríceps', PUSH), d('Tracción', 'Espalda · Bíceps', PULL), d('Pierna', 'Tren inferior', LEGS)],
  },
  ppl_doble: {
    label: 'PPL doble',
    english: 'PPL 6 días',
    days: [
      d('Empuje', 'Pecho · Hombros · Tríceps', PUSH),
      d('Tracción', 'Espalda · Bíceps', PULL),
      d('Pierna', 'Tren inferior', LEGS),
      d('Empuje', 'Pecho · Hombros · Tríceps', PUSH),
      d('Tracción', 'Espalda · Bíceps', PULL),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
  bro_split: {
    label: 'Por grupo muscular',
    english: 'Bro Split',
    days: [
      d('Pecho', 'Pecho', ['Pecho']),
      d('Espalda', 'Espalda', ['Espalda']),
      d('Pierna', 'Tren inferior', LEGS),
      d('Hombros', 'Hombros', ['Hombros']),
      d('Brazos', 'Bíceps · Tríceps', ['Bíceps', 'Tríceps']),
    ],
  },
  torso_extremidades: {
    label: 'Torso / Extremidades',
    english: 'Torso / Limbs',
    days: [
      d('Torso', 'Pecho · Espalda · Hombros', ['Pecho', 'Espalda', 'Hombros']),
      d('Extremidades', 'Brazos y piernas', LIMBS),
      d('Torso', 'Pecho · Espalda · Hombros', ['Pecho', 'Espalda', 'Hombros']),
      d('Extremidades', 'Brazos y piernas', LIMBS),
    ],
  },
  ppl_ul: {
    label: 'PPL + Torso/Pierna',
    english: 'PPL + UL',
    days: [
      d('Empuje', 'Pecho · Hombros · Tríceps', PUSH),
      d('Tracción', 'Espalda · Bíceps', PULL),
      d('Pierna', 'Tren inferior', LEGS),
      d('Torso', 'Tren superior', UPPER),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
  arnold: {
    label: 'Arnold',
    english: 'Arnold Split',
    days: [
      d('Pecho y Espalda', 'Pecho · Espalda', ['Pecho', 'Espalda']),
      d('Hombros y Brazos', 'Hombros · Bíceps · Tríceps', ['Hombros', 'Bíceps', 'Tríceps']),
      d('Pierna', 'Tren inferior', LEGS),
      d('Pecho y Espalda', 'Pecho · Espalda', ['Pecho', 'Espalda']),
      d('Hombros y Brazos', 'Hombros · Bíceps · Tríceps', ['Hombros', 'Bíceps', 'Tríceps']),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
  phul: {
    label: 'Fuerza-Hipertrofia T/P (PHUL)',
    english: 'PHUL',
    days: [
      d('Torso · fuerza', 'Tren superior pesado', UPPER),
      d('Pierna · fuerza', 'Tren inferior pesado', LEGS),
      d('Torso · hipertrofia', 'Tren superior volumen', UPPER),
      d('Pierna · hipertrofia', 'Tren inferior volumen', LEGS),
    ],
  },
  phat: {
    label: 'Powerbuilding (PHAT)',
    english: 'PHAT',
    days: [
      d('Torso · fuerza', 'Tren superior pesado', UPPER),
      d('Pierna · fuerza', 'Tren inferior pesado', LEGS),
      d('Espalda y Hombros · hipertrofia', 'Espalda · Hombros', ['Espalda', 'Hombros']),
      d('Pierna · hipertrofia', 'Tren inferior volumen', LEGS),
      d('Pecho y Brazos · hipertrofia', 'Pecho · Bíceps · Tríceps', ['Pecho', 'Bíceps', 'Tríceps']),
    ],
  },
  ppl_arnold: {
    label: 'PPL + Arnold',
    english: 'híbrido',
    days: [
      d('Empuje', 'Pecho · Hombros · Tríceps', PUSH),
      d('Tracción', 'Espalda · Bíceps', PULL),
      d('Pierna', 'Tren inferior', LEGS),
      d('Pecho y Espalda', 'Pecho · Espalda', ['Pecho', 'Espalda']),
      d('Hombros y Brazos', 'Hombros · Bíceps · Tríceps', ['Hombros', 'Bíceps', 'Tríceps']),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
} as const;

export type SplitType = keyof typeof SPLIT_TEMPLATES | 'personalizado';

export const SPLIT_KEYS = Object.keys(SPLIT_TEMPLATES) as (keyof typeof SPLIT_TEMPLATES)[];

/** Lista para selectores UI (incluye Personalizado al final). */
export const SPLIT_OPTIONS: { value: SplitType; label: string; english: string; dayCount: number }[] = [
  ...SPLIT_KEYS.map((k) => ({
    value: k as SplitType,
    label: SPLIT_TEMPLATES[k].label,
    english: SPLIT_TEMPLATES[k].english,
    dayCount: SPLIT_TEMPLATES[k].days.length,
  })),
  { value: 'personalizado', label: 'Personalizado', english: 'tú decides', dayCount: 0 },
];

export function splitLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === 'personalizado') return 'Personalizado';
  return (SPLIT_TEMPLATES as Record<string, SplitTemplate>)[value]?.label ?? null;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/constants/splits.ts
git commit -m "feat(splits): plantillas canónicas de splits de entrenamiento"
```

---

### Task 3: Lógica pura de filtrado (TDD)

**Files:**
- Create: `domain/exercises/filter.ts`
- Test: `domain/exercises/filter.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// domain/exercises/filter.test.ts
import { describe, expect, it } from 'vitest';
import { filterExercises, type FilterableExercise } from './filter';

const EX: FilterableExercise[] = [
  { id: '1', name: 'Hip Thrust', muscle_group: 'Glúteos', equipment: 'Barra', difficulty: 'intermedio', movement_pattern: 'dominante_cadera' },
  { id: '2', name: 'Press de banca', muscle_group: 'Pecho', equipment: 'Barra', difficulty: 'intermedio', movement_pattern: 'empuje' },
  { id: '3', name: 'Curl con mancuernas', muscle_group: 'Bíceps', equipment: 'Mancuernas', difficulty: 'principiante', movement_pattern: 'traccion' },
  { id: '4', name: 'Sentadilla goblet', muscle_group: 'Cuádriceps', equipment: 'Mancuernas', difficulty: 'principiante', movement_pattern: 'dominante_rodilla' },
];

describe('filterExercises', () => {
  it('devuelve todo sin filtros', () => {
    expect(filterExercises(EX, {})).toHaveLength(4);
  });
  it('busca por nombre ignorando acentos y mayúsculas', () => {
    const r = filterExercises(EX, { query: 'biceps' });
    expect(r.map((e) => e.id)).toEqual(['3']);
  });
  it('filtra por grupo muscular (varios valores = OR)', () => {
    const r = filterExercises(EX, { muscleGroups: ['Glúteos', 'Pecho'] });
    expect(r.map((e) => e.id).sort()).toEqual(['1', '2']);
  });
  it('filtra por equipamiento', () => {
    const r = filterExercises(EX, { equipment: ['Mancuernas'] });
    expect(r.map((e) => e.id).sort()).toEqual(['3', '4']);
  });
  it('filtra por dificultad', () => {
    const r = filterExercises(EX, { difficulty: ['principiante'] });
    expect(r.map((e) => e.id).sort()).toEqual(['3', '4']);
  });
  it('filtra por patrón de movimiento', () => {
    const r = filterExercises(EX, { movementPattern: ['empuje'] });
    expect(r.map((e) => e.id)).toEqual(['2']);
  });
  it('combina filtros (AND entre dimensiones)', () => {
    const r = filterExercises(EX, { equipment: ['Mancuernas'], difficulty: ['principiante'], query: 'sentadilla' });
    expect(r.map((e) => e.id)).toEqual(['4']);
  });
  it('lista vacía si nada coincide', () => {
    expect(filterExercises(EX, { muscleGroups: ['Gemelos'] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm run test -- filter`
Expected: FAIL ("Cannot find module './filter'" o similar).

- [ ] **Step 3: Implementar la función mínima**

```ts
// domain/exercises/filter.ts
export interface FilterableExercise {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  difficulty: string | null;
  movement_pattern: string | null;
}

export interface ExerciseFilters {
  query?: string;
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: string[];
  movementPattern?: string[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function matches(value: string | null, selected?: string[]): boolean {
  if (!selected || selected.length === 0) return true;
  return value != null && selected.includes(value);
}

export function filterExercises<T extends FilterableExercise>(
  exercises: T[],
  filters: ExerciseFilters,
): T[] {
  const q = filters.query ? normalize(filters.query.trim()) : '';
  return exercises.filter((e) => {
    if (q && !normalize(e.name).includes(q)) return false;
    if (!matches(e.muscle_group, filters.muscleGroups)) return false;
    if (!matches(e.equipment, filters.equipment)) return false;
    if (!matches(e.difficulty, filters.difficulty)) return false;
    if (!matches(e.movement_pattern, filters.movementPattern)) return false;
    return true;
  });
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm run test -- filter`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add domain/exercises/filter.ts domain/exercises/filter.test.ts
git commit -m "feat(exercises): filterExercises puro + tests"
```

---

### Task 4: Resolver días de un split (TDD)

**Files:**
- Create: `domain/workouts/splits.ts`
- Test: `domain/workouts/splits.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// domain/workouts/splits.test.ts
import { describe, expect, it } from 'vitest';
import { resolveSplitDays } from './splits';

describe('resolveSplitDays', () => {
  it('genera 3 días para PPL con day_number correlativo', () => {
    const days = resolveSplitDays('ppl');
    expect(days).toHaveLength(3);
    expect(days.map((d) => d.day_number)).toEqual([1, 2, 3]);
    expect(days[0].title).toBe('Empuje');
    expect(days[2].title).toBe('Pierna');
  });
  it('genera 6 días para arnold', () => {
    expect(resolveSplitDays('arnold')).toHaveLength(6);
  });
  it('devuelve [] para personalizado', () => {
    expect(resolveSplitDays('personalizado')).toEqual([]);
  });
  it('devuelve [] para un valor desconocido', () => {
    expect(resolveSplitDays('no_existe')).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm run test -- splits`
Expected: FAIL ("Cannot find module './splits'").

- [ ] **Step 3: Implementar la función**

```ts
// domain/workouts/splits.ts
import { SPLIT_TEMPLATES } from '@/lib/constants/splits';

export interface GeneratedDay {
  day_number: number;
  title: string;
  focus: string;
}

/** Devuelve los días a crear para un split. [] para 'personalizado' o desconocido. */
export function resolveSplitDays(splitType: string): GeneratedDay[] {
  if (splitType === 'personalizado') return [];
  const tpl = (SPLIT_TEMPLATES as Record<string, { days: { title: string; focus: string }[] }>)[splitType];
  if (!tpl) return [];
  return tpl.days.map((d, i) => ({ day_number: i + 1, title: d.title, focus: d.focus }));
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm run test -- splits`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add domain/workouts/splits.ts domain/workouts/splits.test.ts
git commit -m "feat(splits): resolveSplitDays puro + tests"
```

---

### Task 5: Migración 0011 — columnas, normalización, bucket

**Files:**
- Create: `supabase/migrations/0011_exercise_catalog.sql`

- [ ] **Step 1: Crear la migración**

```sql
-- 0011_exercise_catalog.sql
-- Categorías de ejercicio (difficulty, movement_pattern), normalización de seeds,
-- split_type en planes, e índice único de globales. + bucket exercise-images.

-- 1) Columnas nuevas en exercises
alter table public.exercises
  add column if not exists difficulty text
    check (difficulty in ('principiante','intermedio','avanzado'));
alter table public.exercises
  add column if not exists movement_pattern text
    check (movement_pattern in ('empuje','traccion','dominante_cadera','dominante_rodilla','core'));

-- 2) Normalizar los 10 ejercicios ya sembrados a valores canónicos
update public.exercises set muscle_group = 'Femoral' where muscle_group = 'Femorales';
update public.exercises set equipment = 'Mancuernas' where equipment = 'Mancuerna';

update public.exercises set difficulty = 'intermedio', movement_pattern = 'dominante_cadera' where name = 'Hip Thrust';
update public.exercises set difficulty = 'principiante', movement_pattern = 'dominante_rodilla' where name = 'Sentadilla Goblet';
update public.exercises set difficulty = 'intermedio', movement_pattern = 'dominante_cadera' where name = 'Peso Muerto Rumano';
update public.exercises set difficulty = 'principiante', movement_pattern = 'dominante_rodilla' where name = 'Prensa';
update public.exercises set difficulty = 'principiante', movement_pattern = 'traccion' where name = 'Remo con Mancuerna';
update public.exercises set difficulty = 'intermedio', movement_pattern = 'empuje' where name = 'Press de Hombro';
update public.exercises set difficulty = 'principiante', movement_pattern = 'traccion' where name = 'Jalón al Pecho';
update public.exercises set difficulty = 'principiante', movement_pattern = 'dominante_rodilla' where name = 'Curl Femoral';
update public.exercises set difficulty = 'principiante', movement_pattern = 'dominante_cadera' where name = 'Abducción de Cadera';
update public.exercises set difficulty = 'principiante', movement_pattern = 'core' where name = 'Plancha';

-- 3) Índice único de globales por nombre (case-insensitive) para deduplicar seeds
create unique index if not exists exercises_global_name_uidx
  on public.exercises (lower(name)) where is_global;

-- 4) split_type en workout_plans
alter table public.workout_plans
  add column if not exists split_type text
    check (split_type in (
      'cuerpo_completo','torso_pierna','ppl','ppl_doble','bro_split','torso_extremidades',
      'ppl_ul','arnold','phul','phat','ppl_arnold','personalizado'
    ));

-- 5) Bucket público para imágenes de ejercicio (lectura pública, escritura del dueño)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-images', 'exercise-images', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "exercise-images public read" on storage.objects for select to public
  using (bucket_id = 'exercise-images');
create policy "exercise-images owner write" on storage.objects for all to authenticated
  using (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'exercise-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Commit (la migración se aplica manualmente en Supabase después)**

```bash
git add supabase/migrations/0011_exercise_catalog.sql
git commit -m "feat(db): migración 0011 — categorías de ejercicio, split_type, bucket exercise-images"
```

> NOTA para quien ejecuta: aplicar `0011` en el editor SQL de Supabase EN ORDEN antes de probar en un entorno real. El código tolera columnas nulas, así que el typecheck/build local no requiere la migración aplicada.

---

### Task 6: Migración 0012 — seed del catálogo (~35 nuevos → ~45 total)

**Files:**
- Create: `supabase/migrations/0012_exercise_catalog_seed.sql`

- [ ] **Step 1: Crear el seed**

```sql
-- 0012_exercise_catalog_seed.sql
-- Catálogo curado de ejercicios globales en español, categorizados.
-- Idempotente: el índice único exercises_global_name_uidx (0011) hace que
-- 'on conflict do nothing' descarte nombres ya existentes (incluye los 10 previos).

insert into public.exercises (name, muscle_group, equipment, difficulty, movement_pattern, description, status, is_global)
values
  -- Glúteos
  ('Puente de glúteo', 'Glúteos', 'Peso corporal', 'principiante', 'dominante_cadera', 'Elevación de cadera desde el suelo.', 'published', true),
  ('Patada de glúteo en polea', 'Glúteos', 'Polea', 'principiante', 'dominante_cadera', 'Extensión de cadera en polea baja.', 'published', true),
  ('Peso muerto sumo', 'Glúteos', 'Barra', 'avanzado', 'dominante_cadera', 'Peso muerto con stance amplio.', 'published', true),
  -- Cuádriceps
  ('Sentadilla con barra', 'Cuádriceps', 'Barra', 'intermedio', 'dominante_rodilla', 'Sentadilla trasera con barra.', 'published', true),
  ('Extensión de cuádriceps', 'Cuádriceps', 'Máquina', 'principiante', 'dominante_rodilla', 'Extensión de rodilla en máquina.', 'published', true),
  ('Zancadas', 'Cuádriceps', 'Mancuernas', 'intermedio', 'dominante_rodilla', 'Desplazamientos en zancada.', 'published', true),
  ('Sentadilla búlgara', 'Cuádriceps', 'Mancuernas', 'intermedio', 'dominante_rodilla', 'Sentadilla a una pierna con pie atrás elevado.', 'published', true),
  ('Hack squat', 'Cuádriceps', 'Máquina', 'intermedio', 'dominante_rodilla', 'Sentadilla en máquina hack.', 'published', true),
  -- Femoral
  ('Curl femoral sentado', 'Femoral', 'Máquina', 'principiante', 'dominante_rodilla', 'Flexión de rodilla sentado.', 'published', true),
  ('Buenos días', 'Femoral', 'Barra', 'avanzado', 'dominante_cadera', 'Bisagra de cadera con barra en espalda.', 'published', true),
  ('Peso muerto convencional', 'Femoral', 'Barra', 'avanzado', 'dominante_cadera', 'Peso muerto desde el suelo.', 'published', true),
  -- Espalda
  ('Dominadas', 'Espalda', 'Peso corporal', 'avanzado', 'traccion', 'Tracción vertical en barra.', 'published', true),
  ('Remo con barra', 'Espalda', 'Barra', 'intermedio', 'traccion', 'Remo inclinado con barra.', 'published', true),
  ('Remo en máquina', 'Espalda', 'Máquina', 'principiante', 'traccion', 'Remo sentado en máquina.', 'published', true),
  ('Remo en polea baja', 'Espalda', 'Polea', 'principiante', 'traccion', 'Remo horizontal en polea.', 'published', true),
  ('Pullover en polea', 'Espalda', 'Polea', 'intermedio', 'traccion', 'Extensión de hombro en polea alta.', 'published', true),
  -- Pecho
  ('Press de banca', 'Pecho', 'Barra', 'intermedio', 'empuje', 'Press horizontal con barra.', 'published', true),
  ('Press inclinado con mancuernas', 'Pecho', 'Mancuernas', 'intermedio', 'empuje', 'Press en banco inclinado.', 'published', true),
  ('Press de pecho en máquina', 'Pecho', 'Máquina', 'principiante', 'empuje', 'Press horizontal en máquina.', 'published', true),
  ('Aperturas con mancuernas', 'Pecho', 'Mancuernas', 'principiante', 'empuje', 'Apertura de pecho en banco.', 'published', true),
  ('Cruce en polea', 'Pecho', 'Polea', 'intermedio', 'empuje', 'Cruce de poleas para pecho.', 'published', true),
  ('Flexiones', 'Pecho', 'Peso corporal', 'principiante', 'empuje', 'Flexiones de brazos.', 'published', true),
  -- Hombros
  ('Press militar', 'Hombros', 'Barra', 'intermedio', 'empuje', 'Press vertical de pie con barra.', 'published', true),
  ('Elevaciones laterales', 'Hombros', 'Mancuernas', 'principiante', 'empuje', 'Elevación lateral de deltoides.', 'published', true),
  ('Elevaciones frontales', 'Hombros', 'Mancuernas', 'principiante', 'empuje', 'Elevación frontal de deltoides.', 'published', true),
  ('Face pull', 'Hombros', 'Polea', 'principiante', 'traccion', 'Tracción a la cara para deltoide posterior.', 'published', true),
  -- Bíceps
  ('Curl con barra', 'Bíceps', 'Barra', 'principiante', 'traccion', 'Curl de bíceps con barra.', 'published', true),
  ('Curl con mancuernas', 'Bíceps', 'Mancuernas', 'principiante', 'traccion', 'Curl alterno de bíceps.', 'published', true),
  ('Curl martillo', 'Bíceps', 'Mancuernas', 'principiante', 'traccion', 'Curl con agarre neutro.', 'published', true),
  -- Tríceps
  ('Extensión de tríceps en polea', 'Tríceps', 'Polea', 'principiante', 'empuje', 'Extensión de codo en polea alta.', 'published', true),
  ('Press francés', 'Tríceps', 'Barra', 'intermedio', 'empuje', 'Extensión de tríceps tumbado.', 'published', true),
  ('Fondos en banco', 'Tríceps', 'Peso corporal', 'principiante', 'empuje', 'Fondos de tríceps en banco.', 'published', true),
  -- Core
  ('Crunch abdominal', 'Core', 'Peso corporal', 'principiante', 'core', 'Encogimiento abdominal.', 'published', true),
  ('Elevación de piernas', 'Core', 'Peso corporal', 'intermedio', 'core', 'Elevación de piernas para abdomen inferior.', 'published', true),
  ('Russian twist', 'Core', 'Peso corporal', 'intermedio', 'core', 'Giros de tronco sentado.', 'published', true),
  -- Gemelos
  ('Elevación de gemelos de pie', 'Gemelos', 'Máquina', 'principiante', 'dominante_rodilla', 'Elevación de talones de pie.', 'published', true),
  ('Elevación de gemelos sentado', 'Gemelos', 'Máquina', 'principiante', 'dominante_rodilla', 'Elevación de talones sentado.', 'published', true),
  -- Cardio / cuerpo completo (movement_pattern nulo cuando no aplica)
  ('Caminadora', 'Cardio', 'Máquina', 'principiante', null, 'Caminata o trote en cinta.', 'published', true),
  ('Bicicleta estática', 'Cardio', 'Máquina', 'principiante', null, 'Cardio en bicicleta estática.', 'published', true),
  ('Kettlebell swing', 'Cuerpo completo', 'Kettlebell', 'intermedio', 'dominante_cadera', 'Balanceo de kettlebell.', 'published', true),
  ('Burpees', 'Cuerpo completo', 'Peso corporal', 'intermedio', null, 'Ejercicio de cuerpo completo de alta intensidad.', 'published', true)
on conflict do nothing;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0012_exercise_catalog_seed.sql
git commit -m "feat(db): migración 0012 — seed del catálogo de ejercicios en español"
```

---

### Task 7: Tipos DB y enums

**Files:**
- Modify: `types/app.ts`
- Modify: `types/database.ts:350-411` (ExercisesRow/Insert, WorkoutPlansRow/Insert)

- [ ] **Step 1: Añadir enums a `types/app.ts`**

Añadir al final de `types/app.ts` (antes de la interfaz `Macros` o tras los demás tipos):

```ts
export type Difficulty = 'principiante' | 'intermedio' | 'avanzado';
export type MovementPattern = 'empuje' | 'traccion' | 'dominante_cadera' | 'dominante_rodilla' | 'core';
export type SplitType =
  | 'cuerpo_completo'
  | 'torso_pierna'
  | 'ppl'
  | 'ppl_doble'
  | 'bro_split'
  | 'torso_extremidades'
  | 'ppl_ul'
  | 'arnold'
  | 'phul'
  | 'phat'
  | 'ppl_arnold'
  | 'personalizado';
```

- [ ] **Step 2: Importar y añadir columnas en `types/database.ts`**

En el bloque de imports (líneas ~6-23) añadir `Difficulty, MovementPattern, SplitType` a la lista importada de `./app`.

En `ExercisesRow` añadir tras `equipment: string | null;`:
```ts
  difficulty: Difficulty | null;
  movement_pattern: MovementPattern | null;
```
En `ExercisesInsert` añadir tras `equipment?: string | null;`:
```ts
  difficulty?: Difficulty | null;
  movement_pattern?: MovementPattern | null;
```
En `WorkoutPlansRow` añadir tras `level: string | null;`:
```ts
  split_type: SplitType | null;
```
En `WorkoutPlansInsert` añadir tras `level?: string | null;`:
```ts
  split_type?: SplitType | null;
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add types/app.ts types/database.ts
git commit -m "feat(types): difficulty, movement_pattern y split_type"
```

---

## FASE 2 — Validadores y server actions

### Task 8: Validadores

**Files:**
- Modify: `lib/validators/coach.ts:9-24` (exerciseSchema)
- Modify: `domain/workouts/schemas.ts:3-13` (workoutPlanSchema)
- Create: schema por-ítem de plan exercise dentro de `lib/validators/coach.ts`

- [ ] **Step 1: Extender `exerciseSchema` y añadir el schema de ítem en `lib/validators/coach.ts`**

Reemplazar el bloque `exerciseSchema` (líneas 9-24) por:

```ts
import { DIFFICULTIES, EQUIPMENT, MOVEMENT_PATTERNS, MUSCLE_GROUPS } from '@/lib/constants/exercises';

const MOVEMENT_PATTERN_VALUES = MOVEMENT_PATTERNS.map((m) => m.value) as [string, ...string[]];

export const exerciseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(120),
  muscle_group: z.enum(MUSCLE_GROUPS).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  movement_pattern: z.enum(MOVEMENT_PATTERN_VALUES).optional(),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(2000).optional(),
  common_mistakes: z.string().max(2000).optional(),
  video_url: z
    .union([
      z.url().refine((u) => /^https?:\/\//i.test(u), 'Debe ser un enlace http(s) válido'),
      z.literal(''),
    ])
    .optional(),
  thumbnail_url: z
    .union([z.url().refine((u) => /^https?:\/\//i.test(u), 'URL inválida'), z.literal('')])
    .optional(),
  status: z.enum(['draft', 'published', 'archived']).default('published'),
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

/** Un ítem de ejercicio dentro de un día (usado en alta singular, en lote y update). */
export const planExerciseItemSchema = z.object({
  exercise_id: z.uuid('Selecciona un ejercicio'),
  sets: z.coerce.number().int('Series entero').min(1, 'Mínimo 1 serie').max(20, 'Máximo 20 series').default(3),
  reps: z.string().trim().min(1).max(20).default('10'),
  rest_seconds: z.coerce.number().int().min(0).max(3600).nullable().optional(),
  tempo: z.string().trim().max(20).nullable().optional(),
  suggested_weight_kg: z.coerce.number().min(0).max(1000).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type PlanExerciseItemInput = z.infer<typeof planExerciseItemSchema>;
```

> El import de constantes va arriba del archivo junto a `import { z } from 'zod';`.

- [ ] **Step 2: Añadir `split_type` a `workoutPlanSchema` en `domain/workouts/schemas.ts`**

Tras `level: z.string().max(100).optional(),` añadir:

```ts
  split_type: z
    .enum([
      'cuerpo_completo','torso_pierna','ppl','ppl_doble','bro_split','torso_extremidades',
      'ppl_ul','arnold','phul','phat','ppl_arnold','personalizado',
    ])
    .optional(),
```

- [ ] **Step 3: Verificar tipos y tests**

Run: `npm run typecheck && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/validators/coach.ts domain/workouts/schemas.ts
git commit -m "feat(validators): categorías de ejercicio, item de plan y split_type"
```

---

### Task 9: `createWorkoutPlan` genera días desde el split

**Files:**
- Modify: `lib/coach/actions.ts:223-249` (createWorkoutPlan)

- [ ] **Step 1: Importar el resolver de splits**

En la cabecera de imports de `lib/coach/actions.ts` añadir:

```ts
import { resolveSplitDays } from '@/domain/workouts/splits';
```

- [ ] **Step 2: Reemplazar `createWorkoutPlan`**

```ts
export async function createWorkoutPlan(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const parsed = workoutPlanSchema.safeParse({
    student_id: formData.get('student_id'),
    title: formData.get('title'),
    focus: formData.get('focus') || undefined,
    level: formData.get('level') || undefined,
    split_type: formData.get('split_type') || undefined,
    estimated_duration_minutes: formData.get('estimated_duration_minutes') || undefined,
    status: formData.get('status') || 'active',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };
  await assertCoachOwnsStudent(coach.id, parsed.data.student_id);

  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from('workout_plans')
    .insert({
      coach_id: coach.id,
      student_id: parsed.data.student_id,
      title: parsed.data.title,
      focus: parsed.data.focus ?? null,
      level: parsed.data.level ?? null,
      split_type: parsed.data.split_type ?? null,
      estimated_duration_minutes: parsed.data.estimated_duration_minutes ?? null,
      status: parsed.data.status,
    })
    .select('id')
    .single();
  if (error || !plan) return { error: error?.message ?? 'No se pudo crear el plan' };

  // Generar días desde la plantilla del split (excepto personalizado).
  if (parsed.data.split_type) {
    const days = resolveSplitDays(parsed.data.split_type);
    if (days.length > 0) {
      await supabase.from('workout_plan_days').insert(
        days.map((d) => ({
          workout_plan_id: plan.id,
          day_number: d.day_number,
          title: d.title,
          focus: d.focus,
        })),
      );
    }
  }

  revalidatePath(`/coach/students/${parsed.data.student_id}/workouts`);
  redirect(`/coach/students/${parsed.data.student_id}/workouts`);
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/coach/actions.ts
git commit -m "feat(workouts): createWorkoutPlan guarda split y genera días"
```

---

### Task 10: Acciones `createExercise`/`updateExercise` con categorías + imagen

**Files:**
- Modify: `lib/coach/actions.ts:252-281` (createExercise)
- Create (en el mismo archivo, tras createExercise): `updateExercise`

- [ ] **Step 1: Reemplazar `createExercise` para incluir las categorías y thumbnail_url**

```ts
export async function createExercise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const parsed = exerciseSchema.safeParse({
    name: formData.get('name'),
    muscle_group: formData.get('muscle_group') || undefined,
    equipment: formData.get('equipment') || undefined,
    difficulty: formData.get('difficulty') || undefined,
    movement_pattern: formData.get('movement_pattern') || undefined,
    description: formData.get('description') || undefined,
    instructions: formData.get('instructions') || undefined,
    common_mistakes: formData.get('common_mistakes') || undefined,
    video_url: formData.get('video_url') || undefined,
    thumbnail_url: formData.get('thumbnail_url') || undefined,
    status: formData.get('status') || 'published',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  const { error } = await supabase.from('exercises').insert({
    coach_id: coach.id,
    name: parsed.data.name,
    muscle_group: parsed.data.muscle_group ?? null,
    equipment: parsed.data.equipment ?? null,
    difficulty: parsed.data.difficulty ?? null,
    movement_pattern: parsed.data.movement_pattern ?? null,
    description: parsed.data.description ?? null,
    instructions: parsed.data.instructions ?? null,
    common_mistakes: parsed.data.common_mistakes ?? null,
    video_url: parsed.data.video_url || null,
    thumbnail_url: parsed.data.thumbnail_url || null,
    status: parsed.data.status,
  });
  if (error) return { error: error.message };
  revalidatePath('/coach/exercises');
  redirect('/coach/exercises');
}

export async function updateExercise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const coach = await requireCoach();
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: 'Ejercicio no encontrado' };
  const parsed = exerciseSchema.safeParse({
    name: formData.get('name'),
    muscle_group: formData.get('muscle_group') || undefined,
    equipment: formData.get('equipment') || undefined,
    difficulty: formData.get('difficulty') || undefined,
    movement_pattern: formData.get('movement_pattern') || undefined,
    description: formData.get('description') || undefined,
    instructions: formData.get('instructions') || undefined,
    common_mistakes: formData.get('common_mistakes') || undefined,
    video_url: formData.get('video_url') || undefined,
    thumbnail_url: formData.get('thumbnail_url') || undefined,
    status: formData.get('status') || 'published',
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const supabase = await createClient();
  // Una sola coach: puede editar sus ejercicios y los globales (coach_id null).
  const { error } = await supabase
    .from('exercises')
    .update({
      name: parsed.data.name,
      muscle_group: parsed.data.muscle_group ?? null,
      equipment: parsed.data.equipment ?? null,
      difficulty: parsed.data.difficulty ?? null,
      movement_pattern: parsed.data.movement_pattern ?? null,
      description: parsed.data.description ?? null,
      instructions: parsed.data.instructions ?? null,
      common_mistakes: parsed.data.common_mistakes ?? null,
      video_url: parsed.data.video_url || null,
      thumbnail_url: parsed.data.thumbnail_url || null,
      status: parsed.data.status,
    })
    .eq('id', id)
    .or(`coach_id.eq.${coach.id},is_global.eq.true`);
  if (error) return { error: error.message };
  revalidatePath('/coach/exercises');
  redirect(`/coach/exercises/${id}`);
}
```

> NOTA RLS: la política de UPDATE sobre `exercises` debe permitir a la coach editar globales. Si la RLS actual solo permite editar filas con `coach_id = auth.uid()`, el update de globales será bloqueado por RLS (devolvería 0 filas, sin error). Si en pruebas reales no edita globales, añadir una política en una migración posterior; documentarlo aquí pero NO bloquea el plan (la edición de ejercicios propios funciona). Confirmar al ejecutar contra Supabase real.

- [ ] **Step 2: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/coach/actions.ts
git commit -m "feat(exercises): createExercise/updateExercise con categorías e imagen"
```

---

### Task 11: Acciones de lote `addPlanExercises` y `updatePlanExercise`

**Files:**
- Modify: `lib/coach/actions.ts` (añadir tras `addPlanExercise`, ~línea 453)

- [ ] **Step 1: Importar el schema de ítem**

En los imports de validadores de `lib/coach/actions.ts`, ampliar:

```ts
import { coachNoteSchema, contentPostSchema, exerciseSchema, planExerciseItemSchema } from '@/lib/validators/coach';
```

- [ ] **Step 2: Añadir las dos acciones**

```ts
/** Verifica que el día pertenece a un plan de la coach y devuelve el dayId si ok. */
async function assertDayOwnedByCoach(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  dayId: string,
): Promise<boolean> {
  const { data: day } = await supabase
    .from('workout_plan_days')
    .select('workout_plan_id')
    .eq('id', dayId)
    .maybeSingle();
  if (!day) return false;
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('coach_id')
    .eq('id', day.workout_plan_id)
    .maybeSingle();
  return !!plan && plan.coach_id === coachId;
}

export interface AddPlanExercisesInput {
  planId: string;
  dayId: string;
  items: {
    exercise_id: string;
    sets?: number;
    reps?: string;
    rest_seconds?: number | null;
    tempo?: string | null;
    suggested_weight_kg?: number | null;
    notes?: string | null;
  }[];
}

export async function addPlanExercises(input: AddPlanExercisesInput): Promise<ActionState> {
  const coach = await requireCoach();
  if (!input?.dayId || !Array.isArray(input.items) || input.items.length === 0) {
    return { error: 'Selecciona al menos un ejercicio' };
  }
  const supabase = await createClient();
  if (!(await assertDayOwnedByCoach(supabase, coach.id, input.dayId))) {
    return { error: 'No autorizado' };
  }

  const parsedItems = [];
  for (const item of input.items) {
    const parsed = planExerciseItemSchema.safeParse(item);
    if (!parsed.success) return { error: firstError(parsed.error.issues) };
    parsedItems.push(parsed.data);
  }

  const { data: last } = await supabase
    .from('workout_plan_exercises')
    .select('sort_order')
    .eq('workout_plan_day_id', input.dayId)
    .order('sort_order', { ascending: false })
    .limit(1);
  let sortOrder = (last?.[0]?.sort_order ?? 0) + 1;

  const rows = parsedItems.map((it) => ({
    workout_plan_day_id: input.dayId,
    exercise_id: it.exercise_id,
    sort_order: sortOrder++,
    sets: it.sets ?? 3,
    reps: it.reps ?? '10',
    rest_seconds: it.rest_seconds ?? null,
    tempo: it.tempo ?? null,
    suggested_weight_kg: it.suggested_weight_kg ?? null,
    notes: it.notes ?? null,
  }));

  const { error } = await supabase.from('workout_plan_exercises').insert(rows);
  if (error) return { error: error.message };
  revalidatePath(`/coach/workouts/plans/${input.planId}`);
  return { success: `${rows.length} ejercicio(s) agregado(s)` };
}

export interface UpdatePlanExerciseInput {
  id: string;
  planId: string;
  sets: number;
  reps: string;
  rest_seconds?: number | null;
  tempo?: string | null;
  suggested_weight_kg?: number | null;
  notes?: string | null;
}

export async function updatePlanExercise(input: UpdatePlanExerciseInput): Promise<ActionState> {
  const coach = await requireCoach();
  const supabase = await createClient();

  // Verificar propiedad vía el día del ejercicio.
  const { data: pe } = await supabase
    .from('workout_plan_exercises')
    .select('workout_plan_day_id')
    .eq('id', input.id)
    .maybeSingle();
  if (!pe || !(await assertDayOwnedByCoach(supabase, coach.id, pe.workout_plan_day_id))) {
    return { error: 'No autorizado' };
  }

  const parsed = planExerciseItemSchema
    .pick({ sets: true, reps: true, rest_seconds: true, tempo: true, suggested_weight_kg: true, notes: true })
    .safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  const { error } = await supabase
    .from('workout_plan_exercises')
    .update({
      sets: parsed.data.sets ?? 3,
      reps: parsed.data.reps ?? '10',
      rest_seconds: parsed.data.rest_seconds ?? null,
      tempo: parsed.data.tempo ?? null,
      suggested_weight_kg: parsed.data.suggested_weight_kg ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq('id', input.id);
  if (error) return { error: error.message };
  revalidatePath(`/coach/workouts/plans/${input.planId}`);
  return { success: 'Ejercicio actualizado' };
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/coach/actions.ts
git commit -m "feat(workouts): addPlanExercises (lote) y updatePlanExercise"
```

---

## FASE 3 — Queries

### Task 12: Exponer categorías y split_type en queries

**Files:**
- Modify: `lib/db/queries/workout-plan.ts:5-19` (PlanExerciseRow + select de exercises)

- [ ] **Step 1: Ampliar `PlanExerciseRow`**

En la interfaz `PlanExerciseRow` (líneas 5-19) añadir tras `muscle_group: string | null;`:

```ts
  equipment: string | null;
  difficulty: string | null;
  movement_pattern: string | null;
  thumbnail_url: string | null;
```

- [ ] **Step 2: Ampliar el select de exercises y el armado de filas**

Cambiar el select (línea ~57) de:
```ts
    ? await supabase.from('exercises').select('id, name, muscle_group, video_url').in('id', exerciseIds)
```
a:
```ts
    ? await supabase
        .from('exercises')
        .select('id, name, muscle_group, equipment, difficulty, movement_pattern, video_url, thumbnail_url')
        .in('id', exerciseIds)
```

En el push de `arr` (líneas ~65-79) añadir tras `muscle_group: ex?.muscle_group ?? null,`:
```ts
      equipment: ex?.equipment ?? null,
      difficulty: ex?.difficulty ?? null,
      movement_pattern: ex?.movement_pattern ?? null,
      thumbnail_url: ex?.thumbnail_url ?? null,
```

> `plan` ya se selecciona con `select('*')`, por lo que `split_type` queda disponible automáticamente una vez añadida la columna al tipo (Task 7).

- [ ] **Step 3: Verificar tipos**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/db/queries/workout-plan.ts
git commit -m "feat(queries): exponer categorías de ejercicio en el contenido del plan"
```

---

## FASE 4 — UI

### Task 13: `ExerciseForm` con selects de categoría + subida de imagen

**Files:**
- Modify: `components/coach/ExerciseForm.tsx` (reescritura)
- Modify: `app/(protected)/coach/exercises/new/page.tsx` (pasar `coachId`)

- [ ] **Step 1: Reescribir `ExerciseForm`**

```tsx
'use client';

import { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/utils/compress-image';
import { createExercise, updateExercise } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  EQUIPMENT,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
} from '@/lib/constants/exercises';
import { Button, FormField, Input, Select, Textarea, SubmitButton } from '@/components/common';
import type { Exercise } from '@/types/database';

export function ExerciseForm({ coachId, exercise }: { coachId: string; exercise?: Exercise }) {
  const isEdit = !!exercise;
  const [state, action] = useActionState(isEdit ? updateExercise : createExercise, initialActionState);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [thumb, setThumb] = useState<string>(exercise?.thumbnail_url ?? '');
  const [busy, setBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError(null);
    setBusy(true);
    try {
      const blob = await compressImage(file);
      if (blob.size > 5 * 1024 * 1024) {
        setImgError('La imagen es demasiado grande (máx 5MB).');
        return;
      }
      const supabase = createClient();
      const path = `${coachId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from('exercise-images')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) {
        setImgError(error.message);
        return;
      }
      const { data } = supabase.storage.from('exercise-images').getPublicUrl(path);
      setThumb(`${data.publicUrl}?v=${Date.now()}`);
    } catch {
      setImgError('No se pudo subir la imagen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={action} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={exercise.id} />}
      <input type="hidden" name="thumbnail_url" value={thumb} />

      <FormField label="Nombre" htmlFor="name">
        <Input id="name" name="name" placeholder="Ej: Hip Thrust" defaultValue={exercise?.name ?? ''} required />
      </FormField>

      {/* Imagen */}
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-elevated">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-xs text-faint">Sin imagen</span>
          )}
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => fileRef.current?.click()}>
            <Camera className="size-4" /> Subir imagen
          </Button>
          {imgError && <p className="mt-1 text-sm text-danger">{imgError}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Grupo muscular" htmlFor="muscle_group">
          <Select id="muscle_group" name="muscle_group" placeholder="Elegir…" defaultValue={exercise?.muscle_group ?? ''}>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Equipo" htmlFor="equipment">
          <Select id="equipment" name="equipment" placeholder="Elegir…" defaultValue={exercise?.equipment ?? ''}>
            {EQUIPMENT.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Dificultad" htmlFor="difficulty">
          <Select id="difficulty" name="difficulty" placeholder="Elegir…" defaultValue={exercise?.difficulty ?? ''}>
            {DIFFICULTIES.map((dlevel) => (
              <option key={dlevel} value={dlevel}>{DIFFICULTY_LABEL[dlevel]}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Patrón" htmlFor="movement_pattern">
          <Select id="movement_pattern" name="movement_pattern" placeholder="Elegir…" defaultValue={exercise?.movement_pattern ?? ''}>
            {MOVEMENT_PATTERNS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Descripción" htmlFor="description">
        <Textarea id="description" name="description" rows={2} defaultValue={exercise?.description ?? ''} />
      </FormField>
      <FormField label="Instrucciones" htmlFor="instructions">
        <Textarea id="instructions" name="instructions" rows={3} defaultValue={exercise?.instructions ?? ''} />
      </FormField>
      <FormField label="Errores comunes" htmlFor="common_mistakes">
        <Textarea id="common_mistakes" name="common_mistakes" rows={2} defaultValue={exercise?.common_mistakes ?? ''} />
      </FormField>
      <FormField label="URL de video" htmlFor="video_url" hint="Opcional">
        <Input id="video_url" name="video_url" type="url" placeholder="https://…" defaultValue={exercise?.video_url ?? ''} />
      </FormField>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>{isEdit ? 'Guardar cambios' : 'Guardar ejercicio'}</SubmitButton>
    </form>
  );
}
```

- [ ] **Step 2: Pasar `coachId` en la página de nuevo ejercicio**

Reescribir `app/(protected)/coach/exercises/new/page.tsx`:

```tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { Card, PageHeader } from '@/components/common';
import { ExerciseForm } from '@/components/coach/ExerciseForm';

export const metadata = { title: 'Nuevo ejercicio' };

export default async function NewExercisePage() {
  const coach = await requireCoach();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/coach/exercises" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Ejercicios
      </Link>
      <PageHeader title="Nuevo ejercicio" />
      <Card className="p-6">
        <ExerciseForm coachId={coach.id} />
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos y lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/coach/ExerciseForm.tsx "app/(protected)/coach/exercises/new/page.tsx"
git commit -m "feat(exercises): formulario con categorías y subida de imagen"
```

---

### Task 14: Página de editar ejercicio

**Files:**
- Create: `app/(protected)/coach/exercises/[exerciseId]/edit/page.tsx`
- Modify: `app/(protected)/coach/exercises/[exerciseId]/page.tsx:30-35` (añadir botón "Editar")

- [ ] **Step 1: Crear la página de edición**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/common';
import { ExerciseForm } from '@/components/coach/ExerciseForm';

export const metadata = { title: 'Editar ejercicio' };

export default async function EditExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const coach = await requireCoach();
  const supabase = await createClient();
  const { data: exercise } = await supabase.from('exercises').select('*').eq('id', exerciseId).maybeSingle();
  if (!exercise) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href={`/coach/exercises/${exerciseId}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <PageHeader title="Editar ejercicio" />
      <Card className="p-6">
        <ExerciseForm coachId={coach.id} exercise={exercise} />
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Añadir el botón "Editar" en la página de detalle**

En `app/(protected)/coach/exercises/[exerciseId]/page.tsx`, reemplazar el bloque `actions={...}` del `PageHeader` (líneas ~30-35) por:

```tsx
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/coach/exercises/${e.id}/edit`}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm text-foreground hover:bg-elevated"
            >
              Editar
            </Link>
            {canEdit && <ArchiveItemButton id={e.id} kind="exercise" archived={e.status === 'archived'} />}
          </div>
        }
```

> Todos los ejercicios muestran "Editar" (una sola coach). El archivado sigue limitado a `canEdit`.

- [ ] **Step 3: Verificar tipos, lint y build**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(protected)/coach/exercises/[exerciseId]/edit/page.tsx" "app/(protected)/coach/exercises/[exerciseId]/page.tsx"
git commit -m "feat(exercises): página de edición de ejercicio"
```

---

### Task 15: Componente `ExerciseFilters` (chips reutilizables)

**Files:**
- Create: `components/coach/ExerciseFilters.tsx`

- [ ] **Step 1: Crear el componente de chips de filtro**

```tsx
'use client';

import { Search } from 'lucide-react';
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  EQUIPMENT,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
} from '@/lib/constants/exercises';
import type { ExerciseFilters as Filters } from '@/domain/exercises/filter';

type Dim = 'muscleGroups' | 'equipment' | 'difficulty' | 'movementPattern';

export function ExerciseFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  function toggle(dim: Dim, value: string) {
    const current = new Set(filters[dim] ?? []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    onChange({ ...filters, [dim]: [...current] });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input
          value={filters.query ?? ''}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Buscar ejercicio…"
          className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <ChipRow label="Grupo muscular" values={[...MUSCLE_GROUPS]} active={filters.muscleGroups} onToggle={(v) => toggle('muscleGroups', v)} />
      <ChipRow label="Equipo" values={[...EQUIPMENT]} active={filters.equipment} onToggle={(v) => toggle('equipment', v)} />
      <ChipRow
        label="Dificultad"
        values={[...DIFFICULTIES]}
        labelFor={(v) => DIFFICULTY_LABEL[v as keyof typeof DIFFICULTY_LABEL] ?? v}
        active={filters.difficulty}
        onToggle={(v) => toggle('difficulty', v)}
      />
      <ChipRow
        label="Patrón"
        values={MOVEMENT_PATTERNS.map((m) => m.value)}
        labelFor={(v) => MOVEMENT_PATTERNS.find((m) => m.value === v)?.label ?? v}
        active={filters.movementPattern}
        onToggle={(v) => toggle('movementPattern', v)}
      />
    </div>
  );
}

function ChipRow({
  label,
  values,
  active,
  labelFor,
  onToggle,
}: {
  label: string;
  values: string[];
  active?: string[];
  labelFor?: (v: string) => string;
  onToggle: (v: string) => void;
}) {
  const set = new Set(active ?? []);
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-wide text-faint">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => {
          const on = set.has(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onToggle(v)}
              className={
                on
                  ? 'rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-white'
                  : 'rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-primary/50'
              }
            >
              {labelFor ? labelFor(v) : v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/coach/ExerciseFilters.tsx
git commit -m "feat(exercises): chips de filtro reutilizables"
```

---

### Task 16: `ExerciseCatalogPicker` (modal multi-selección + configuración)

**Files:**
- Create: `components/coach/ExerciseCatalogPicker.tsx`

- [ ] **Step 1: Crear el componente del catálogo**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Plus, X, Check } from 'lucide-react';
import { filterExercises, type ExerciseFilters as Filters, type FilterableExercise } from '@/domain/exercises/filter';
import { muscleGroupColor } from '@/lib/constants/exercises';
import { addPlanExercises } from '@/lib/coach/actions';
import { Button } from '@/components/common';
import { ExerciseFilters } from '@/components/coach/ExerciseFilters';

export interface CatalogExercise extends FilterableExercise {
  thumbnail_url: string | null;
}

interface ItemConfig {
  sets: string;
  reps: string;
  suggested_weight_kg: string;
  rest_seconds: string;
  tempo: string;
  notes: string;
}

const DEFAULT_CONFIG: ItemConfig = { sets: '3', reps: '10', suggested_weight_kg: '', rest_seconds: '', tempo: '', notes: '' };

export function ExerciseCatalogPicker({
  planId,
  dayId,
  exercises,
  prefillMuscleGroups,
}: {
  planId: string;
  dayId: string;
  exercises: CatalogExercise[];
  prefillMuscleGroups: string[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [filters, setFilters] = useState<Filters>({ muscleGroups: prefillMuscleGroups });
  const [selected, setSelected] = useState<Record<string, ItemConfig>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => filterExercises(exercises, filters), [exercises, filters]);
  const selectedIds = Object.keys(selected);
  const selectedExercises = exercises.filter((e) => selectedIds.includes(e.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = { ...DEFAULT_CONFIG };
      return next;
    });
  }

  function setConfig(id: string, patch: Partial<ItemConfig>) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function reset() {
    setOpen(false);
    setStep(1);
    setSelected({});
    setFilters({ muscleGroups: prefillMuscleGroups });
    setError(null);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await addPlanExercises({
        planId,
        dayId,
        items: selectedIds.map((id) => {
          const c = selected[id];
          return {
            exercise_id: id,
            sets: c.sets ? Number(c.sets) : 3,
            reps: c.reps || '10',
            rest_seconds: c.rest_seconds ? Number(c.rest_seconds) : null,
            tempo: c.tempo || null,
            suggested_weight_kg: c.suggested_weight_kg ? Number(c.suggested_weight_kg) : null,
            notes: c.notes || null,
          };
        }),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      reset();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Añadir ejercicios
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/70 p-0 sm:items-center sm:p-6">
      <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-none border border-border bg-canvas sm:h-[90vh] sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <p className="font-display text-lg font-semibold text-foreground">
            {step === 1 ? 'Elegir ejercicios' : 'Configurar ejercicios'}
            <span className="ml-2 text-sm font-normal text-primary">{selectedIds.length} elegido(s)</span>
          </p>
          <button type="button" onClick={reset} className="text-faint hover:text-foreground" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 ? (
            <div className="space-y-4">
              <ExerciseFilters filters={filters} onChange={setFilters} />
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-faint">Ningún ejercicio coincide con los filtros.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filtered.map((e) => {
                    const on = !!selected[e.id];
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggle(e.id)}
                        className={
                          'relative rounded-lg border p-2 text-left transition-colors ' +
                          (on ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-elevated')
                        }
                      >
                        {on && (
                          <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="size-3" />
                          </span>
                        )}
                        <div className="mb-2 flex h-16 items-center justify-center overflow-hidden rounded-md bg-elevated">
                          {e.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={e.thumbnail_url} alt="" className="size-full object-cover" />
                          ) : (
                            <span
                              className="flex size-9 items-center justify-center rounded-full text-sm font-bold text-white"
                              style={{ backgroundColor: muscleGroupColor(e.muscle_group) }}
                            >
                              {(e.muscle_group ?? 'E').slice(0, 1)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-tight text-foreground">{e.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {[e.muscle_group, e.equipment].filter(Boolean).join(' · ')}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedExercises.length === 0 ? (
                <p className="py-8 text-center text-sm text-faint">No elegiste ejercicios.</p>
              ) : (
                selectedExercises.map((e) => {
                  const c = selected[e.id];
                  return (
                    <div key={e.id} className="rounded-lg border border-border bg-surface p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-medium text-foreground">{e.name}</p>
                        <button type="button" onClick={() => toggle(e.id)} className="text-faint hover:text-danger">
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        <Field label="Series" value={c.sets} onChange={(v) => setConfig(e.id, { sets: v })} type="number" />
                        <Field label="Reps" value={c.reps} onChange={(v) => setConfig(e.id, { reps: v })} />
                        <Field label="Peso kg" value={c.suggested_weight_kg} onChange={(v) => setConfig(e.id, { suggested_weight_kg: v })} type="number" />
                        <Field label="Desc. s" value={c.rest_seconds} onChange={(v) => setConfig(e.id, { rest_seconds: v })} type="number" />
                        <Field label="Tempo" value={c.tempo} onChange={(v) => setConfig(e.id, { tempo: v })} />
                        <Field label="Nota" value={c.notes} onChange={(v) => setConfig(e.id, { notes: v })} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-3">
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="ml-auto flex items-center gap-2">
            {step === 2 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)}>
                Atrás
              </Button>
            )}
            {step === 1 ? (
              <Button type="button" size="sm" disabled={selectedIds.length === 0} onClick={() => setStep(2)}>
                Configurar ({selectedIds.length})
              </Button>
            ) : (
              <Button type="button" size="sm" loading={busy} disabled={selectedIds.length === 0} onClick={submit}>
                Añadir {selectedIds.length} al día
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-faint">{label}</span>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        step={type === 'number' ? '0.1' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-sm text-foreground focus:border-primary focus:outline-none"
      />
    </label>
  );
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/coach/ExerciseCatalogPicker.tsx
git commit -m "feat(workouts): selector visual de ejercicios con configuración por lotes"
```

---

### Task 17: Edición inline de ejercicio en el plan (`PlanExerciseRow`)

**Files:**
- Create: `components/coach/PlanExerciseRow.tsx`

- [ ] **Step 1: Crear el componente de fila editable**

```tsx
'use client';

import { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { updatePlanExercise, deletePlanExercise } from '@/lib/coach/actions';
import { Button } from '@/components/common';
import type { PlanExerciseRow as Row } from '@/lib/db/queries/workout-plan';

export function PlanExerciseRow({ ex, planId }: { ex: Row; planId: string }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    sets: String(ex.sets),
    reps: ex.reps,
    suggested_weight_kg: ex.suggested_weight_kg != null ? String(ex.suggested_weight_kg) : '',
    rest_seconds: ex.rest_seconds != null ? String(ex.rest_seconds) : '',
    tempo: ex.tempo ?? '',
    notes: ex.notes ?? '',
  });

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await updatePlanExercise({
        id: ex.id,
        planId,
        sets: form.sets ? Number(form.sets) : 3,
        reps: form.reps || '10',
        suggested_weight_kg: form.suggested_weight_kg ? Number(form.suggested_weight_kg) : null,
        rest_seconds: form.rest_seconds ? Number(form.rest_seconds) : null,
        tempo: form.tempo || null,
        notes: form.notes || null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-3 py-2">
        <div>
          <p className="font-medium text-foreground">{ex.exercise_name}</p>
          <p className="tabular text-sm text-muted">
            {ex.sets} series × {ex.reps} reps
            {ex.rest_seconds ? ` · ${ex.rest_seconds}s desc.` : ''}
            {ex.tempo ? ` · tempo ${ex.tempo}` : ''}
            {ex.suggested_weight_kg ? ` · ${ex.suggested_weight_kg}kg` : ''}
          </p>
          {ex.notes && <p className="text-xs text-faint">{ex.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="text-faint hover:text-foreground" aria-label="Editar ejercicio">
            <Pencil className="size-4" />
          </button>
          <form action={deletePlanExercise.bind(null, ex.id, planId)}>
            <button type="submit" className="text-faint hover:text-danger" aria-label="Quitar ejercicio">
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-2 py-2">
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">{ex.exercise_name}</p>
        <button type="button" onClick={() => setEditing(false)} className="text-faint hover:text-foreground" aria-label="Cancelar">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Field label="Series" type="number" value={form.sets} onChange={(v) => setForm({ ...form, sets: v })} />
        <Field label="Reps" value={form.reps} onChange={(v) => setForm({ ...form, reps: v })} />
        <Field label="Peso kg" type="number" value={form.suggested_weight_kg} onChange={(v) => setForm({ ...form, suggested_weight_kg: v })} />
        <Field label="Desc. s" type="number" value={form.rest_seconds} onChange={(v) => setForm({ ...form, rest_seconds: v })} />
        <Field label="Tempo" value={form.tempo} onChange={(v) => setForm({ ...form, tempo: v })} />
        <Field label="Nota" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" size="sm" loading={busy} onClick={save}>
        Guardar
      </Button>
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-faint">{label}</span>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        step={type === 'number' ? '0.1' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-border bg-canvas px-2 text-sm text-foreground focus:border-primary focus:outline-none"
      />
    </label>
  );
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/coach/PlanExerciseRow.tsx
git commit -m "feat(workouts): edición inline de ejercicio del plan"
```

---

### Task 18: Integrar picker + edición inline + pre-filtro en el constructor del plan

**Files:**
- Modify: `app/(protected)/coach/workouts/plans/[planId]/page.tsx` (reescritura)

- [ ] **Step 1: Reescribir la página del constructor**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Dumbbell, Trash2 } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { getWorkoutPlanContent } from '@/lib/db/queries/workout-plan';
import { deleteWorkoutDay } from '@/lib/coach/actions';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/common';
import { AddWorkoutDayForm } from '@/components/coach/AddWorkoutDayForm';
import { ExerciseCatalogPicker, type CatalogExercise } from '@/components/coach/ExerciseCatalogPicker';
import { PlanExerciseRow } from '@/components/coach/PlanExerciseRow';
import { SPLIT_TEMPLATES, splitLabel } from '@/lib/constants/splits';

export default async function WorkoutPlanBuilderPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const coach = await requireCoach();
  const content = await getWorkoutPlanContent(planId);
  if (!content || content.plan.coach_id !== coach.id) notFound();

  const supabase = await createClient();
  const { data: library } = await supabase
    .from('exercises')
    .select('id, name, muscle_group, equipment, difficulty, movement_pattern, thumbnail_url')
    .or(`coach_id.eq.${coach.id},is_global.eq.true`)
    .neq('status', 'archived')
    .order('name');
  const exercises = (library ?? []) as CatalogExercise[];

  // Pre-filtro por enfoque del día: re-resolver la plantilla del split por day_number.
  const splitType = content.plan.split_type;
  const template =
    splitType && splitType !== 'personalizado'
      ? (SPLIT_TEMPLATES as Record<string, { days: { muscleGroups: string[] }[] }>)[splitType]
      : null;
  const splitName = splitLabel(splitType);

  return (
    <div className="space-y-6">
      <Link
        href={`/coach/students/${content.plan.student_id}/workouts`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <PageHeader
        title={content.plan.title}
        description={[splitName, content.plan.focus, content.plan.level].filter(Boolean).join(' · ') || 'Plan de entrenamiento'}
        actions={<Badge tone={content.plan.status === 'active' ? 'success' : 'neutral'}>{content.plan.status}</Badge>}
      />

      {exercises.length === 0 && (
        <p className="rounded-md border border-warning/25 bg-warning/5 p-3 text-sm text-foreground">
          No tienes ejercicios en tu biblioteca todavía.{' '}
          <Link href="/coach/exercises/new" className="text-primary hover:underline">
            Crea uno
          </Link>{' '}
          para poder asignarlo a los días.
        </p>
      )}

      {content.days.length === 0 ? (
        <EmptyState title="Sin días aún" description="Agrega el primer día del plan abajo." icon={Dumbbell} />
      ) : (
        <div className="space-y-4">
          {content.days.map((day) => {
            const prefill = template?.days[day.day_number - 1]?.muscleGroups ?? [];
            return (
              <Card key={day.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>
                      Día {day.day_number}: {day.title}
                      {day.focus && <span className="ml-2 text-sm font-normal text-muted">· {day.focus}</span>}
                    </CardTitle>
                    <form action={deleteWorkoutDay.bind(null, day.id, planId)}>
                      <button type="submit" className="text-faint hover:text-danger" aria-label="Eliminar día">
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {day.exercises.length === 0 ? (
                    <p className="text-sm text-faint">Sin ejercicios en este día.</p>
                  ) : (
                    <ul className="divide-y divide-hairline">
                      {day.exercises.map((ex) => (
                        <PlanExerciseRow key={ex.id} ex={ex} planId={planId} />
                      ))}
                    </ul>
                  )}
                  <ExerciseCatalogPicker
                    planId={planId}
                    dayId={day.id}
                    exercises={exercises}
                    prefillMuscleGroups={prefill}
                  />
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Agregar día</CardTitle>
        </CardHeader>
        <CardBody>
          <AddWorkoutDayForm planId={planId} />
        </CardBody>
      </Card>
    </div>
  );
}
```

> Se elimina el uso de `AddPlanExerciseForm` aquí. El archivo del componente se conserva (no se borra) por si se referencia en otro sitio; verificar con grep en el Step 2.

- [ ] **Step 2: Verificar que `AddPlanExerciseForm` no quede referenciado en otro lugar**

Run: `npx grep -rn "AddPlanExerciseForm" app components 2>/dev/null || rg -n "AddPlanExerciseForm" app components`
Expected: solo aparece su propia definición en `components/coach/AddPlanExerciseForm.tsx`. Si no hay otras referencias, queda como código muerto tolerado (no se borra sin inspección; se puede limpiar en una tarea aparte).

- [ ] **Step 3: Verificar tipos, lint y build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(protected)/coach/workouts/plans/[planId]/page.tsx"
git commit -m "feat(workouts): constructor con catálogo, edición inline y pre-filtro por split"
```

---

### Task 19: Selector de split en `WorkoutPlanForm`

**Files:**
- Modify: `components/coach/WorkoutPlanForm.tsx` (añadir selector de split)

- [ ] **Step 1: Reescribir `WorkoutPlanForm` con el selector de split**

```tsx
'use client';

import { useActionState } from 'react';
import { createWorkoutPlan } from '@/lib/coach/actions';
import { initialActionState } from '@/lib/auth/action-state';
import { SPLIT_OPTIONS } from '@/lib/constants/splits';
import { FormField, Input, Select, SubmitButton } from '@/components/common';

export function WorkoutPlanForm({ studentId }: { studentId: string }) {
  const [state, action] = useActionState(createWorkoutPlan, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="student_id" value={studentId} />
      <FormField label="Título del plan" htmlFor="title">
        <Input id="title" name="title" placeholder="Ej: Fuerza — 4 días" required />
      </FormField>

      <FormField label="Split" htmlFor="split_type" hint="Genera los días automáticamente (Personalizado = tú los defines)">
        <Select id="split_type" name="split_type" placeholder="Elegir split…" defaultValue="">
          {SPLIT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
              {s.dayCount > 0 ? ` · ${s.dayCount} días` : ''}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Enfoque" htmlFor="focus" hint="Opcional — ej: tren inferior, full body">
        <Input id="focus" name="focus" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Nivel" htmlFor="level">
          <Input id="level" name="level" placeholder="Principiante / Intermedio" />
        </FormField>
        <FormField label="Duración (min)" htmlFor="estimated_duration_minutes">
          <Input id="estimated_duration_minutes" name="estimated_duration_minutes" type="number" inputMode="numeric" />
        </FormField>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton>Crear plan de entrenamiento</SubmitButton>
    </form>
  );
}
```

- [ ] **Step 2: Verificar tipos y lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/coach/WorkoutPlanForm.tsx
git commit -m "feat(workouts): selector de split al crear plan"
```

---

### Task 20: Biblioteca de ejercicios con filtros y tarjetas

**Files:**
- Create: `components/coach/ExerciseLibraryBrowser.tsx`
- Modify: `app/(protected)/coach/exercises/page.tsx` (usar el browser para los activos)

- [ ] **Step 1: Crear el browser cliente de la biblioteca**

```tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { filterExercises, type ExerciseFilters as Filters, type FilterableExercise } from '@/domain/exercises/filter';
import { muscleGroupColor } from '@/lib/constants/exercises';
import { Badge } from '@/components/common';
import { ExerciseFilters } from '@/components/coach/ExerciseFilters';

export interface LibraryExercise extends FilterableExercise {
  thumbnail_url: string | null;
  is_global: boolean;
}

export function ExerciseLibraryBrowser({ exercises }: { exercises: LibraryExercise[] }) {
  const [filters, setFilters] = useState<Filters>({});
  const filtered = useMemo(() => filterExercises(exercises, filters), [exercises, filters]);

  return (
    <div className="space-y-4">
      <ExerciseFilters filters={filters} onChange={setFilters} />
      <p className="text-xs text-faint">{filtered.length} ejercicio(s)</p>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-faint">Ningún ejercicio coincide con los filtros.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <Link
              key={e.id}
              href={`/coach/exercises/${e.id}`}
              className="block rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-elevated">
                  {e.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.thumbnail_url} alt="" className="size-full object-cover" />
                  ) : (
                    <span
                      className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: muscleGroupColor(e.muscle_group) }}
                    >
                      {(e.muscle_group ?? 'E').slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-foreground">{e.name}</p>
                    {e.is_global && <Badge tone="info">Global</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {[e.muscle_group, e.equipment].filter(Boolean).join(' · ') || 'General'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Usar el browser en la página de biblioteca**

En `app/(protected)/coach/exercises/page.tsx`:

1. Cambiar el select a traer las categorías: `.select('*')` ya las trae (la tabla tiene todas las columnas). No requiere cambio en el select.
2. Importar el browser: `import { ExerciseLibraryBrowser, type LibraryExercise } from '@/components/coach/ExerciseLibraryBrowser';`
3. Reemplazar el bloque de la grilla de `active` (líneas ~37-61) por:

```tsx
      {active.length === 0 ? (
        <EmptyState title="Sin ejercicios" description="Crea tu primer ejercicio." />
      ) : (
        <ExerciseLibraryBrowser exercises={active as LibraryExercise[]} />
      )}
```

> El bloque de `archived` se mantiene tal cual (no se filtra). El import de `ArchiveItemButton` sigue usándose en archived.

- [ ] **Step 3: Verificar tipos, lint y build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/coach/ExerciseLibraryBrowser.tsx "app/(protected)/coach/exercises/page.tsx"
git commit -m "feat(exercises): biblioteca con filtros, búsqueda y tarjetas"
```

---

### Task 21: Mostrar el split en la vista del alumno

**Files:**
- Modify: `app/(protected)/student/workout/page.tsx:36-41` (PageHeader description)

- [ ] **Step 1: Importar `splitLabel` y mostrarlo**

Añadir el import:
```ts
import { splitLabel } from '@/lib/constants/splits';
```

Reemplazar el `PageHeader` (líneas ~38-41) por:

```tsx
      <PageHeader
        title="Mi entrenamiento"
        description={
          content
            ? [splitLabel(content.plan.split_type), content.plan.title].filter(Boolean).join(' · ')
            : 'Registra lo que entrenaste.'
        }
      />
```

> La estructura de días ya es visible para el alumno vía `GuidedWorkoutLogForm` (recibe `plannedDays`), que muestra cada día con sus ejercicios. Añadir el nombre del split en el encabezado completa el requisito de visibilidad.

- [ ] **Step 2: Verificar tipos, lint y build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(protected)/student/workout/page.tsx"
git commit -m "feat(student): mostrar el split del plan en la vista de entrenamiento"
```

---

## Verificación final

### Task 22: Suite completa + verificación en navegador

- [ ] **Step 1: Correr toda la suite**

Run: `npm run test && npm run typecheck && npm run lint && npm run build`
Expected: todo PASS.

- [ ] **Step 2: (Entorno real) Aplicar migraciones en Supabase**

Aplicar EN ORDEN en el editor SQL de Supabase: `0011_exercise_catalog.sql`, luego `0012_exercise_catalog_seed.sql`. Confirmar que `exercises` tiene ~45 filas globales y que la edición de globales por la coach funciona (si la RLS lo bloquea, crear política de UPDATE para coach — ver nota en Task 10).

- [ ] **Step 3: Verificación manual del flujo (coach)**

Con el dev server (`npm run dev`):
1. `/coach/exercises` → filtrar por "Glúteos", buscar "press" → ver tarjetas.
2. Crear un ejercicio nuevo con categorías + imagen → aparece en la biblioteca con su miniatura.
3. Crear un plan para una alumna eligiendo split "PPL" → se generan 3 días (Empuje, Tracción, Pierna).
4. En un día "Empuje", abrir "Añadir ejercicios" → los filtros vienen con Pecho/Hombros/Tríceps pre-marcados → elegir 3 → configurar series/reps/peso → "Añadir 3 al día".
5. Editar inline las series de un ejercicio añadido → se guarda.
6. Crear un plan "Personalizado" → no genera días; agregar días manualmente.

- [ ] **Step 4: Verificación manual del flujo (alumno)**

Entrar como alumna con plan activo → `/student/workout` muestra el nombre del split y los días con ejercicios.

- [ ] **Step 5: Commit final / merge**

```bash
git add -A
git commit -m "chore: verificación final catálogo de ejercicios + splits" || echo "nada que commitear"
```

---

## Cobertura del spec (self-review)

| Requisito del spec | Task(s) |
|---|---|
| Migración 0011 (columnas, normalización, bucket) | Task 5 |
| Migración 0012 (~45 ejercicios) | Task 6 |
| Constantes canónicas (4 dimensiones) | Task 1 |
| `SPLIT_TEMPLATES` (11 + personalizado) | Task 2 |
| `filterExercises` puro + tests | Task 3 |
| Resolución de splits pura + tests | Task 4 |
| Tipos DB / enums | Task 7 |
| `exerciseSchema` con enums + categorías; item schema; `workoutPlanSchema` split | Task 8 |
| `createWorkoutPlan` genera días | Task 9 |
| `createExercise`/`updateExercise` con categorías + imagen | Task 10 |
| `addPlanExercises` (lote), `updatePlanExercise` | Task 11 |
| Queries exponen categorías + split_type | Task 12 |
| `ExerciseForm` selects + subida de imagen | Task 13 |
| Página de edición de ejercicio | Task 14 |
| Chips de filtro | Task 15 |
| `ExerciseCatalogPicker` (multi-selección + lote) | Task 16 |
| Edición inline en el plan | Task 17 |
| Integración constructor (picker + pre-filtro) | Task 18 |
| Selector de split en `WorkoutPlanForm` | Task 19 |
| Biblioteca con filtros/tarjetas | Task 20 |
| Visibilidad del split para el alumno | Task 21 |
| Suite verde + verificación | Task 22 |
