# Nutrición: unidades + calendario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar comida en gramos/ml/unidades con cálculo automático de macros, y un calendario nutricional que muestre la adherencia diaria vs la meta del plan, con gráfico de tendencia (alumna y coach).

**Architecture:** Cada `food_item` puede definir `grams_per_unit` + `unit_label`. Al registrar, la cantidad+unidad se convierte a gramos (dominio puro `toGrams`) y luego a macros con el `calculateFoodMacros` existente (macros por 100g, sin cambios). El estado de adherencia por día se deriva en dominio puro (`dayAdherence`) y se pinta en un `NutritionCalendar` + `NutritionAdherenceChart` (SVG, sin librería), espejo del calendario de entrenamiento.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict (`noUncheckedIndexedAccess`), Supabase, Zod v4, Vitest, Tailwind v4. Migraciones vía Supabase Management API (token en `OPERATIONS.local.md`).

**Convención TS strict:** acceso por índice → `T | undefined`. Usa `?.`, `?? fallback`, `Map.get` con guardas, `(x): x is string => !!x`.

**Commits:** uno por tarea, mensaje en español sin secretos, terminando con `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. PowerShell NO soporta heredoc `<<`; usa la herramienta Bash para commits con heredoc, o `git commit -F <tempfile>`.

---

## Estructura de archivos

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `supabase/migrations/0015_nutrition_units.sql` | Columnas de unidad en `food_items` + `food_log_items`, backfill, seed de unidades comunes | Crear |
| `domain/nutrition/units.ts` (+ `.test.ts`) | `toGrams`, `availableUnits`, `formatQuantity` | Crear |
| `domain/nutrition/adherence.ts` (+ `.test.ts`) | `dayAdherence` + umbrales | Crear |
| `domain/nutrition/schemas.ts` | `foodLogItemSchema` gana `unit` + `quantity` | Modificar |
| `lib/student/actions.ts` | `logFood` convierte unidad→gramos | Modificar |
| `lib/student/food-actions.ts` | `createCustomFood` + `NewFood` ganan `grams_per_unit`/`unit_label` | Modificar |
| `types/database.ts` | columnas nuevas en `FoodItems*` / `FoodLogItems*` | Modificar |
| `lib/db/queries/student-nutrition.ts` | `getStudentNutritionRange` | Modificar |
| `app/(protected)/student/meals/new/page.tsx` | seleccionar `grams_per_unit`/`unit_label` al cargar alimentos | Modificar |
| `components/student/FoodLogForm.tsx` | selector de unidad por línea | Modificar |
| `components/student/CreateFoodDialog.tsx` | campos gramos/unidad + etiqueta | Modificar |
| `components/nutrition/NutritionCalendar.tsx` | calendario de adherencia (espejo de TrainingCalendar) | Crear |
| `components/nutrition/NutritionAdherenceChart.tsx` | gráfico SVG de tendencia | Crear |
| `app/(protected)/student/nutrition/page.tsx` | integrar calendario + gráfico | Modificar |
| `app/(protected)/coach/students/[studentId]/nutrition/page.tsx` | calendario de la alumna | Modificar |

---

## Task 1: Migración 0015 (columnas de unidad + backfill + seed)

**Files:**
- Create: `supabase/migrations/0015_nutrition_units.sql`

- [ ] **Step 1: Escribir la migración idempotente**

```sql
-- 0015_nutrition_units.sql
-- Soporte de unidades (g/ml/unidad) para registrar comida. Idempotente.

alter table public.food_items add column if not exists grams_per_unit numeric;
alter table public.food_items add column if not exists unit_label text;

alter table public.food_log_items add column if not exists unit text;
alter table public.food_log_items add column if not exists quantity numeric;

-- Backfill: registros antiguos quedan como gramos.
update public.food_log_items
set unit = 'g'
where unit is null;
update public.food_log_items
set quantity = grams
where quantity is null;

-- Seed idempotente de gramos/unidad para alimentos públicos comunes (no pisa valores ya puestos).
update public.food_items set grams_per_unit = 50, unit_label = 'huevo'
  where is_public = true and grams_per_unit is null and lower(name) like '%huevo%';
update public.food_items set grams_per_unit = 30, unit_label = 'rebanada'
  where is_public = true and grams_per_unit is null and (lower(name) like '%pan%' or lower(name) like '%rebanada%');
update public.food_items set grams_per_unit = 118, unit_label = 'unidad'
  where is_public = true and grams_per_unit is null and lower(name) like '%banana%';
```

- [ ] **Step 2: Aplicar vía Management API**

Lee `C:\EveFitMethod\OPERATIONS.local.md` para el token de Supabase Management + project ref. Aplica el SQL con `POST /v1/projects/{ref}/database/query`, header `Authorization: Bearer <SBP_TOKEN>`, body `{"query":"<SQL>"}`. NO reveles el token ni lo dejes en ningún archivo del repo (si escribes un script temporal con global `fetch`, bórralo después). Verifica respuesta sin `error`.

- [ ] **Step 3: Commit**

Mensaje: `feat(db): migracion 0015 unidades de nutricion (food_items + food_log_items)` + línea Co-Authored-By.

---

## Task 2: Dominio — units.ts (conversión de unidades)

**Files:**
- Create: `domain/nutrition/units.ts`
- Test: `domain/nutrition/units.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
// domain/nutrition/units.test.ts
import { describe, it, expect } from 'vitest';
import { toGrams, availableUnits, formatQuantity } from './units';

describe('toGrams', () => {
  it('gramos y ml se cuentan 1:1', () => {
    expect(toGrams(150, 'g', null)).toBe(150);
    expect(toGrams(200, 'ml', null)).toBe(200);
  });
  it('unidad multiplica por gramos por unidad', () => {
    expect(toGrams(2, 'unit', 50)).toBe(100);
  });
  it('unidad sin gramos/unidad devuelve 0', () => {
    expect(toGrams(2, 'unit', null)).toBe(0);
  });
});

describe('availableUnits', () => {
  it('incluye unidad solo si hay grams_per_unit', () => {
    expect(availableUnits({ grams_per_unit: 50 })).toEqual(['g', 'ml', 'unit']);
    expect(availableUnits({ grams_per_unit: null })).toEqual(['g', 'ml']);
  });
});

describe('formatQuantity', () => {
  it('formatea unidades con etiqueta y plural simple', () => {
    expect(formatQuantity(2, 'unit', 'huevo')).toBe('2 huevos');
    expect(formatQuantity(1, 'unit', 'huevo')).toBe('1 huevo');
  });
  it('formatea g y ml', () => {
    expect(formatQuantity(150, 'g', null)).toBe('150 g');
    expect(formatQuantity(200, 'ml', null)).toBe('200 ml');
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm run test -- units`
Expected: FAIL — `Cannot find module './units'`.

- [ ] **Step 3: Implementar units.ts**

```typescript
// domain/nutrition/units.ts
/** Unidades de registro de comida. 'g' y 'ml' se cuentan 1:1 a gramos; 'unit' usa grams_per_unit. */
export type FoodUnit = 'g' | 'ml' | 'unit';

export function toGrams(quantity: number, unit: FoodUnit, gramsPerUnit: number | null): number {
  if (unit === 'unit') {
    if (gramsPerUnit == null || gramsPerUnit <= 0) return 0;
    return quantity * gramsPerUnit;
  }
  return quantity; // g y ml -> 1:1
}

export function availableUnits(food: { grams_per_unit: number | null }): FoodUnit[] {
  return food.grams_per_unit != null && food.grams_per_unit > 0 ? ['g', 'ml', 'unit'] : ['g', 'ml'];
}

export function formatQuantity(quantity: number, unit: FoodUnit, unitLabel: string | null): string {
  if (unit === 'unit') {
    const label = unitLabel ?? 'unidad';
    return `${quantity} ${label}${quantity === 1 ? '' : 's'}`;
  }
  return `${quantity} ${unit}`;
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm run test -- units`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat(domain): conversion de unidades de comida (g/ml/unidad)`.

---

## Task 3: Dominio — adherence.ts (adherencia diaria)

**Files:**
- Create: `domain/nutrition/adherence.ts`
- Test: `domain/nutrition/adherence.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
// domain/nutrition/adherence.test.ts
import { describe, it, expect } from 'vitest';
import { dayAdherence } from './adherence';

describe('dayAdherence', () => {
  it('sin registros -> sin_registro', () => {
    expect(dayAdherence(0, 2000, false)).toBe('sin_registro');
  });
  it('con registros pero sin meta -> sin_meta', () => {
    expect(dayAdherence(1500, null, true)).toBe('sin_meta');
    expect(dayAdherence(1500, 0, true)).toBe('sin_meta');
  });
  it('dentro de ±10% -> cumplido', () => {
    expect(dayAdherence(1950, 2000, true)).toBe('cumplido');
    expect(dayAdherence(2100, 2000, true)).toBe('cumplido');
  });
  it('entre ±10% y ±25% -> cerca', () => {
    expect(dayAdherence(1700, 2000, true)).toBe('cerca');
    expect(dayAdherence(2400, 2000, true)).toBe('cerca');
  });
  it('más allá de ±25% -> lejos', () => {
    expect(dayAdherence(1000, 2000, true)).toBe('lejos');
    expect(dayAdherence(3000, 2000, true)).toBe('lejos');
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm run test -- adherence`
Expected: FAIL — `Cannot find module './adherence'`.

- [ ] **Step 3: Implementar adherence.ts**

```typescript
// domain/nutrition/adherence.ts
/** Adherencia diaria por calorías vs meta. Umbrales relativos. */
export const ADHERENCE_OK = 0.1; // ±10%
export const ADHERENCE_NEAR = 0.25; // ±25%

export type DayAdherence = 'cumplido' | 'cerca' | 'lejos' | 'sin_registro' | 'sin_meta';

export function dayAdherence(
  consumedCalories: number,
  targetCalories: number | null,
  hasLogs: boolean,
): DayAdherence {
  if (!hasLogs) return 'sin_registro';
  if (targetCalories == null || targetCalories <= 0) return 'sin_meta';
  const diff = Math.abs(consumedCalories - targetCalories) / targetCalories;
  if (diff <= ADHERENCE_OK) return 'cumplido';
  if (diff <= ADHERENCE_NEAR) return 'cerca';
  return 'lejos';
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm run test -- adherence`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat(domain): adherencia nutricional diaria por calorias`.

---

## Task 4: Schema — `foodLogItemSchema` gana `unit` + `quantity`

**Files:**
- Modify: `domain/nutrition/schemas.ts:18-21`

- [ ] **Step 1: Reescribir `foodLogItemSchema`**

Reemplaza (líneas 18-21):

```typescript
export const foodLogItemSchema = z.object({
  food_item_id: z.uuid().nullable().optional(),
  unit: z.enum(['g', 'ml', 'unit']).default('g'),
  quantity: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  grams: z.coerce.number().positive('Los gramos deben ser mayores a 0'),
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (puede romper temporalmente `logFood` si ya consumía el schema; se arregla en Task 5 — si typecheck falla por eso, continúa a Task 5 y verifica al final de Task 5).

- [ ] **Step 3: Commit** — `feat(nutrition): schema de item de comida con unidad y cantidad`.

---

## Task 5: `logFood` convierte unidad→gramos + creación de alimento con unidad

**Files:**
- Modify: `lib/student/actions.ts:18-84` (`LogFoodInput` + `logFood`)
- Modify: `lib/student/food-actions.ts` (`NewFood`, `schema`, `createCustomFood`)
- Modify: `types/database.ts` (columnas nuevas)

- [ ] **Step 1: Actualizar tipos de DB**

En `types/database.ts`, en las filas de `food_items` (Row e Insert) añade `grams_per_unit: number | null` y `unit_label: string | null`; en `food_log_items` (Row e Insert) añade `unit: string | null` y `quantity: number | null`. (Búscalas por nombre de tabla; añade los campos como opcionales/nullable según el patrón del archivo.)

- [ ] **Step 2: `LogFoodInput` + `logFood` usan unidad**

En `lib/student/actions.ts`, añade el import:

```typescript
import { toGrams } from '@/domain/nutrition/units';
```

Reemplaza la interfaz `LogFoodInput` (líneas 18-23) por:

```typescript
export interface LogFoodInput {
  mealType: MealType;
  notes?: string;
  photoPath?: string | null;
  items: { foodItemId: string; unit: 'g' | 'ml' | 'unit'; quantity: number }[];
}
```

En `logFood`, cambia el `safeParse` para validar unit+quantity+grams y la construcción de `rows`. El `food_items` select debe traer `grams_per_unit`. Reemplaza el cuerpo desde el `const parsed = foodLogSchema.safeParse(...)` (línea 29) hasta el `if (rows.length > 0) ...` (línea 79) por:

```typescript
  const supabasePre = await createClient();
  const ids0 = input.items.map((i) => i.foodItemId);
  const { data: foods0 } = await supabasePre
    .from('food_items')
    .select('id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit')
    .in('id', ids0);
  const foodMap = new Map((foods0 ?? []).map((f) => [f.id, f]));

  const itemsWithGrams = input.items.map((i) => {
    const food = foodMap.get(i.foodItemId);
    const gramsPerUnit = food?.grams_per_unit ?? null;
    return { ...i, grams: toGrams(i.quantity, i.unit, gramsPerUnit) };
  });

  const parsed = foodLogSchema.safeParse({
    meal_type: input.mealType,
    notes: input.notes || undefined,
    items: itemsWithGrams.map((i) => ({
      food_item_id: i.foodItemId,
      unit: i.unit,
      quantity: i.quantity,
      grams: i.grams,
    })),
  });
  if (!parsed.success) return { error: firstError(parsed.error.issues) };

  if (input.photoPath && !input.photoPath.startsWith(`${student.id}/`)) {
    return { error: 'Ruta de foto inválida.' };
  }

  const supabase = await createClient();
  const coachId = await getStudentCoachId(student.id);
  const { data: log, error: logErr } = await supabase
    .from('food_logs')
    .insert({
      student_id: student.id,
      coach_id: coachId,
      meal_type: input.mealType,
      logged_at: new Date().toISOString(),
      notes: input.notes ?? null,
      photo_path: input.photoPath ?? null,
    })
    .select('id')
    .single();
  if (logErr || !log) return { error: logErr?.message ?? 'No se pudo guardar el registro.' };

  const rows = itemsWithGrams.flatMap((item) => {
    const food = foodMap.get(item.foodItemId);
    if (!food) return [];
    const macros = calculateFoodMacros(food, item.grams);
    return [
      {
        food_log_id: log.id,
        food_item_id: item.foodItemId,
        unit: item.unit,
        quantity: item.quantity,
        grams: item.grams,
        calories: macros.calories,
        protein_g: macros.protein_g,
        carbs_g: macros.carbs_g,
        fat_g: macros.fat_g,
      },
    ];
  });
  if (rows.length > 0) await supabase.from('food_log_items').insert(rows);
```

(Nota: se elimina el bloque viejo de `ids`/`foods`/`foodMap`/insert que estaba entre las líneas 40-79; este reemplazo lo cubre. Verifica que no queden variables duplicadas como `foodMap` o `coachId`.)

- [ ] **Step 3: `createCustomFood` acepta unidad**

En `lib/student/food-actions.ts`:
- Añade a `NewFood` (interfaz): `grams_per_unit: number | null;` y `unit_label: string | null;`.
- Añade al `schema` zod: `grams_per_unit: z.coerce.number().positive().max(5000).nullable().optional(), unit_label: z.string().max(40).nullable().optional(),`.
- Amplía el parámetro `input` con `gramsPerUnit?: number | null; unitLabel?: string | null;`.
- En el `.insert`, añade `grams_per_unit: parsed.data.grams_per_unit ?? null, unit_label: parsed.data.unit_label ?? null,` y en el `.select(...)` añade `grams_per_unit, unit_label`.
- Mapea `input.gramsPerUnit`/`input.unitLabel` al `safeParse` (claves `grams_per_unit`/`unit_label`).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit** — `feat(nutrition): logFood convierte unidad a gramos; crear alimento con unidad`.

---

## Task 6: Query `getStudentNutritionRange`

**Files:**
- Modify: `lib/db/queries/student-nutrition.ts` (añadir al final)

- [ ] **Step 1: Añadir la query de rango**

Añade al final de `lib/db/queries/student-nutrition.ts`:

```typescript
export interface NutritionDayTotals {
  consumed: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  hasLogs: boolean;
}

export interface StudentNutritionRange {
  target: {
    calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  };
  /** dateISO (YYYY-MM-DD) -> totales consumidos ese día. */
  byDate: Record<string, NutritionDayTotals>;
}

/** Totales consumidos por día en un rango [startISO, endISO] + meta del plan activo. */
export async function getStudentNutritionRange(
  studentId: string,
  startISO: string,
  endISO: string,
): Promise<StudentNutritionRange> {
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('nutrition_plans')
    .select('calories_target, protein_target_g, carbs_target_g, fat_target_g')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const target = {
    calories: plan?.calories_target ?? null,
    protein_g: plan?.protein_target_g ?? null,
    carbs_g: plan?.carbs_target_g ?? null,
    fat_g: plan?.fat_target_g ?? null,
  };

  const { data: logs } = await supabase
    .from('food_logs')
    .select('id, logged_at')
    .eq('student_id', studentId)
    .gte('logged_at', `${startISO}T00:00:00`)
    .lte('logged_at', `${endISO}T23:59:59`);

  const logDate = new Map<string, string>();
  for (const l of logs ?? []) logDate.set(l.id, l.logged_at.slice(0, 10));
  const logIds = [...logDate.keys()];

  const byDate: Record<string, NutritionDayTotals> = {};
  if (logIds.length === 0) return { target, byDate };

  const { data: items } = await supabase
    .from('food_log_items')
    .select('food_log_id, calories, protein_g, carbs_g, fat_g')
    .in('food_log_id', logIds);

  for (const it of items ?? []) {
    const dateISO = logDate.get(it.food_log_id);
    if (!dateISO) continue;
    const cur = byDate[dateISO] ?? {
      consumed: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      hasLogs: true,
    };
    cur.consumed.calories += it.calories;
    cur.consumed.protein_g += it.protein_g;
    cur.consumed.carbs_g += it.carbs_g;
    cur.consumed.fat_g += it.fat_g;
    byDate[dateISO] = cur;
  }
  // Días con log pero sin items (raro) igualmente cuentan como con registro.
  for (const dateISO of logDate.values()) {
    if (!byDate[dateISO]) {
      byDate[dateISO] = { consumed: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }, hasLogs: true };
    }
  }
  // Redondeo a 1 decimal.
  for (const k of Object.keys(byDate)) {
    const c = byDate[k]!.consumed;
    c.calories = Math.round(c.calories * 10) / 10;
    c.protein_g = Math.round(c.protein_g * 10) / 10;
    c.carbs_g = Math.round(c.carbs_g * 10) / 10;
    c.fat_g = Math.round(c.fat_g * 10) / 10;
  }
  return { target, byDate };
}
```

- [ ] **Step 2: Typecheck** — `npm run typecheck`. Expected: PASS.

- [ ] **Step 3: Commit** — `feat(queries): totales de nutricion por dia en un rango`.

---

## Task 7: `FoodLogForm` — selector de unidad por línea

**Files:**
- Modify: `components/student/FoodLogForm.tsx`
- Modify: `app/(protected)/student/meals/new/page.tsx` (cargar `grams_per_unit`/`unit_label`)

> **Contexto:** `FoodLogForm` hoy guarda `Line { foodItemId, name, grams }` y manda `items: { foodItemId, grams }`. Hay que pasar a `Line { foodItemId, name, quantity, unit }`, mostrar un `Select` de unidad (según `availableUnits`) + cantidad, calcular gramos con `toGrams` para el preview de macros, y mandar `{ foodItemId, unit, quantity }`. READ el archivo actual primero.

- [ ] **Step 1: Cargar las columnas de unidad en la página de registro**

En `app/(protected)/student/meals/new/page.tsx`, donde se hace el `select(...)` de `food_items` para pasar a `FoodLogForm`, añade `grams_per_unit, unit_label` a las columnas seleccionadas. (Léelo para ubicar el select exacto.)

- [ ] **Step 2: Ampliar `FoodOption` y `Line` y la conversión**

En `components/student/FoodLogForm.tsx`:
- Añade el import: `import { toGrams, availableUnits, type FoodUnit } from '@/domain/nutrition/units';`.
- Amplía `FoodOption` (líneas 15-22) con `grams_per_unit: number | null;` y `unit_label: string | null;`.
- Cambia `interface Line` (líneas 24-28) a:

```typescript
interface Line {
  foodItemId: string;
  name: string;
  quantity: number;
  unit: FoodUnit;
}
```

- En `addFood` (líneas 97-100), inicializa `{ foodItemId: f.id, name: f.name, quantity: 100, unit: 'g' }`.
- Donde se calculan macros de cada línea (en `totals` y en el render, usando `l.grams`), reemplaza por gramos derivados: `const grams = toGrams(l.quantity, l.unit, foodMap.get(l.foodItemId)?.grams_per_unit ?? null);` y usa ese `grams` en `calculateFoodMacros`.
- En el render de cada línea (líneas 189-204), reemplaza el input de gramos por un `Select` de unidad (`availableUnits(f)` → opciones g/ml/unidad con etiqueta legible) + un `Input` de cantidad, mostrando los gramos resultantes (`{grams} g`) cuando la unidad no sea `g`.
- En `submit` (línea 118), manda `items: lines.map((l) => ({ foodItemId: l.foodItemId, unit: l.unit, quantity: l.quantity }))`.
- En `handleCreated`, `NewFood` ahora incluye `grams_per_unit`/`unit_label`; asegúrate de que `FoodOption` los reciba.

Etiquetas de unidad para el Select: `g` → "g", `ml` → "ml", `unit` → la `unit_label` del alimento (o "unidad").

- [ ] **Step 3: Typecheck + build** — `npm run typecheck && npm run build`. Expected: PASS.

- [ ] **Step 4: Commit** — `feat(nutrition): selector de unidad (g/ml/unidad) al registrar comida`.

---

## Task 8: `CreateFoodDialog` — campos gramos/unidad

**Files:**
- Modify: `components/student/CreateFoodDialog.tsx`

- [ ] **Step 1: Añadir campos opcionales de unidad**

En `components/student/CreateFoodDialog.tsx`:
- Amplía `EMPTY` con `gramsPerUnit: '', unitLabel: ''`.
- Añade dos `FormField` (después del grid de macros, antes del error): "Gramos por unidad (opcional)" (`type=number`, ej. 50) y "Nombre de la unidad (opcional)" (`text`, ej. "huevo, rebanada").
- En `submit`, pasa a `createCustomFood`: `gramsPerUnit: values.gramsPerUnit ? Number(values.gramsPerUnit) : null, unitLabel: values.unitLabel.trim() || null`.
- Actualiza la `Dialog.Description` para mencionar que puede definir una unidad (ej. "1 huevo = 50 g").

- [ ] **Step 2: Typecheck + build** — `npm run typecheck && npm run build`. Expected: PASS.

- [ ] **Step 3: Commit** — `feat(nutrition): definir gramos por unidad al crear un alimento`.

---

## Task 9: Componentes `NutritionCalendar` + `NutritionAdherenceChart`

**Files:**
- Create: `components/nutrition/NutritionCalendar.tsx`
- Create: `components/nutrition/NutritionAdherenceChart.tsx`

> **Contexto:** espeja la estructura de `components/workouts/TrainingCalendar.tsx` (week/month toggle, grid mensual con `monthGridISO`, selección de día, panel de detalle). READ ese archivo para copiar el patrón de navegación y estilos. Aquí el estado de cada día viene de `dayAdherence(consumed.calories, target.calories, hasLogs)` sobre el `byDate` de `getStudentNutritionRange`.

- [ ] **Step 1: Leer el patrón existente**

Run: lee `components/workouts/TrainingCalendar.tsx` y `domain/workouts/calendar.ts` (`monthGridISO`, `startOfWeekISO`, `addDaysISO`, `WEEKDAYS`) para reutilizar el patrón de grid y semana.

- [ ] **Step 2: Implementar `NutritionAdherenceChart.tsx`**

```tsx
// components/nutrition/NutritionAdherenceChart.tsx
export interface AdherencePoint {
  dateISO: string;
  calories: number;
}

/** Tendencia de calorías consumidas por día vs meta (línea de meta punteada). SVG puro. */
export function NutritionAdherenceChart({
  points,
  target,
}: {
  points: AdherencePoint[];
  target: number | null;
}) {
  const data = points.slice(-14);
  if (data.length === 0) {
    return <p className="text-xs text-faint">Aún no hay registros para mostrar tu tendencia.</p>;
  }
  const W = 300;
  const H = 90;
  const gap = 6;
  const barW = (W - gap * (data.length - 1)) / data.length;
  const maxVal = Math.max(...data.map((d) => d.calories), target ?? 0, 1);

  return (
    <div className="space-y-1.5">
      <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label="Tendencia de calorías">
        {target != null && target > 0 && (
          <line
            x1={0}
            x2={W}
            y1={H - (target / maxVal) * H}
            y2={H - (target / maxVal) * H}
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity={0.7}
          />
        )}
        {data.map((d, i) => {
          const h = Math.round((d.calories / maxVal) * H);
          const x = i * (barW + gap);
          return (
            <rect key={d.dateISO} x={x} y={H - h} width={barW} height={h} rx="2" fill="var(--color-primary)" opacity={0.55} />
          );
        })}
      </svg>
      {target != null && target > 0 && (
        <p className="text-xs text-muted">Línea punteada = tu meta ({target} kcal)</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implementar `NutritionCalendar.tsx`** (cliente)

Modela la navegación en `TrainingCalendar`. Props:

```tsx
'use client';
import { useMemo, useState } from 'react';
import { monthGridISO, startOfWeekISO, addDaysISO, WEEKDAYS } from '@/domain/workouts/calendar';
import { dayAdherence, type DayAdherence } from '@/domain/nutrition/adherence';
import type { NutritionDayTotals } from '@/lib/db/queries/student-nutrition';

export function NutritionCalendar({
  byDate,
  target,
  todayISO,
}: {
  byDate: Record<string, NutritionDayTotals>;
  target: { calories: number | null };
  todayISO: string;
}) { /* week/month toggle + grid + day detail; status color per dayAdherence */ }
```

Reglas de color por estado (usa tokens, no hex):
- `cumplido` → `text-success` / fondo `bg-success/15`
- `cerca` → `text-warning` / `bg-warning/15`
- `lejos` → `text-danger` / `bg-danger/15`
- `sin_meta` → `text-muted` / `bg-canvas`
- `sin_registro` → `text-faint` / sin fondo

Cada celda calcula `const t = byDate[dateISO]; const st = dayAdherence(t?.consumed.calories ?? 0, target.calories, !!t?.hasLogs);`. Al seleccionar un día, muestra debajo las kcal consumidas vs meta y la proteína (`t.consumed.protein_g`). Reutiliza el layout/estilos del calendario de entrenamiento (encabezado de días `WEEKDAYS`, grid `monthGridISO(year, month)`), incluyendo el toggle semana/mes. Mantén todo TS-strict-safe.

- [ ] **Step 4: Typecheck + build** — `npm run typecheck && npm run build`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(nutrition): calendario de adherencia + grafico de tendencia`.

---

## Task 10: Integrar el calendario en las páginas (alumna + coach)

**Files:**
- Modify: `app/(protected)/student/nutrition/page.tsx`
- Modify: `app/(protected)/coach/students/[studentId]/nutrition/page.tsx`

> **Contexto:** READ ambas páginas. Calcula un rango de ~28 días terminando hoy y pásalo al calendario; arma los `points` para el gráfico desde `byDate`.

- [ ] **Step 1: Página de nutrición de la alumna**

En `app/(protected)/student/nutrition/page.tsx`:
- Importa `getStudentNutritionRange`, `NutritionCalendar`, `NutritionAdherenceChart`.
- Calcula `const todayISO = new Date().toISOString().slice(0,10);` y `const startISO = addDaysISO(todayISO, -27);` (importa `addDaysISO` de `@/domain/workouts/calendar`).
- `const range = await getStudentNutritionRange(profile.id, startISO, todayISO);`
- Arma `points`: para cada fecha del rango con datos, `{ dateISO, calories: range.byDate[dateISO]?.consumed.calories ?? 0 }` (genera la lista de fechas con `addDaysISO` de start a hoy).
- Renderiza dos tarjetas nuevas: el `NutritionCalendar` (`byDate={range.byDate}`, `target={{ calories: range.target.calories }}`, `todayISO`) y el `NutritionAdherenceChart` (`points`, `target={range.target.calories}`), debajo de las metas existentes.

- [ ] **Step 2: Página de nutrición del coach**

En `app/(protected)/coach/students/[studentId]/nutrition/page.tsx`, de forma análoga, obtén `getStudentNutritionRange(studentId, startISO, todayISO)` y renderiza el `NutritionCalendar` + `NutritionAdherenceChart` de esa alumna (solo lectura; el coach ya está autorizado por la guarda de la página).

- [ ] **Step 3: Typecheck + build** — `npm run typecheck && npm run build`. Expected: PASS.

- [ ] **Step 4: Commit** — `feat(nutrition): integrar calendario y grafico en paginas de alumna y coach`.

---

## Task 11: Verificación final + deploy

- [ ] **Step 1: Suite completa**

Run: `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build`. Los cuatro en verde (tests nuevos `units`, `adherence` incluidos).

- [ ] **Step 2: Prueba manual (local `npm run dev`)**

1. Crear un alimento con "gramos por unidad = 50, unidad = huevo".
2. Registrar "2 huevos" → preview debe mostrar 100 g y macros correctas; guardar.
3. En `/student/nutrition`: ver el calendario con el día de hoy en color según adherencia y el gráfico de tendencia.
4. Como coach: ver el calendario de esa alumna en su página de nutrición.

- [ ] **Step 3: Push + deploy**

`git push origin main`, luego deploy a Vercel (ver `OPERATIONS.local.md`): `vercel deploy --prod --scope eve-fit-method --token <VERCEL_TOKEN>`.

---

## Self-Review (cobertura del spec)

- **Unidades g/ml/unidad + cálculo automático:** Tasks 1 (DB), 2 (toGrams), 4 (schema), 5 (logFood), 7 (UI), 8 (crear alimento).
- **Calendario de adherencia + estados:** Tasks 3 (dayAdherence), 6 (query rango), 9 (NutritionCalendar), 10 (integración).
- **Gráfico de tendencia (SVG, sin librería):** Tasks 9 (NutritionAdherenceChart), 10.
- **Lo ven alumna y coach:** Task 10 (ambas páginas).
- **Backfill/compatibilidad + seed unidades comunes:** Task 1.
- **Verificación:** Task 11.

Tipos consistentes: `FoodUnit` (Task 2) reusado en schema (4), actions (5), form (7); `DayAdherence` (Task 3) en calendar (9); `NutritionDayTotals`/`StudentNutritionRange` (Task 6) en calendar (9) y páginas (10). Sin placeholders.
