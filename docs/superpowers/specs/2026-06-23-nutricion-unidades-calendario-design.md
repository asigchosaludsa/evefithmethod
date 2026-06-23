# Sub-proyecto B — Nutrición: unidades + calendario (Design)

> Parte 2 de 3 del overhaul de progreso/entrenamiento/nutrición.
> Hermanos: A (Entrenamiento, DONE) · C (Dashboard de Progreso).
> Aprobado por la dueña el 2026-06-23.

## Objetivo

Permitir registrar comida en **gramos, mililitros o unidades** (con cálculo automático de macros), y
dar un **calendario nutricional** que muestre la adherencia diaria vs la meta del plan, con un gráfico
de tendencia. Lo ven la alumna y la coach.

## Problema actual

- El registro de comida es **solo en gramos** (`FoodLogForm` tiene el sufijo "g" hardcodeado; el
  schema solo acepta `grams`). La columna `food_items.serving_unit` existe pero está sin usar y no
  hay "gramos por unidad" (ej. 1 huevo = 50g).
- Las macros se guardan **por 100g** y se escalan linealmente (`calculateFoodMacros`).
- El plan nutricional (`nutrition_plans`) son **solo metas diarias** (kcal + macros); no hay
  concepto de día ni calendario. La única vista por día es `getStudentNutritionDay` (hoy).
- No hay calendario nutricional ni gráficos de adherencia.

## Decisiones (acordadas)

1. **Unidades por alimento:** cada `food_item` puede definir `grams_per_unit` + `unit_label`
   (ej. 50 / "huevo"). Al registrar se elige **g / ml / unidad**; ml se asume **1 ml ≈ 1 g** (sin
   densidad real). El cálculo de macros convierte todo a gramos. El coach define los gramos/unidad al
   crear un alimento; los alimentos comunes se siembran con su valor.
2. **Calendario nutricional:** muestra **adherencia por día** (no menú planeado). Estado del día por
   **calorías**: ✓ dentro de ±10% de la meta, ⚠ dentro de ±25%, ✗ fuera, "sin registro" si no hay
   comidas. Al tocar un día se ven las comidas registradas + la proteína.
3. **Gráfico:** tendencia de los últimos ~14 días (calorías consumidas vs meta + proteína), en **SVG
   puro** (sin librería nueva; el patrón de A).

## Arquitectura

### Unidades (sin romper el modelo de macros por 100g)

- **`food_items`** gana `grams_per_unit numeric null` y `unit_label text null`.
- Reglas de unidad al registrar un alimento:
  - **g**: siempre disponible.
  - **ml**: siempre disponible; se convierte 1:1 a gramos.
  - **unidad**: disponible solo si `grams_per_unit` no es null; gramos = `quantity * grams_per_unit`.
- **`food_log_items`** gana `unit text` (`'g' | 'ml' | 'unit'`) y `quantity numeric` (lo que escribió
  la alumna), manteniendo `grams` como valor canónico ya calculado y las macros denormalizadas.
- El cálculo de macros sigue usando `calculateFoodMacros(food, grams)`; lo nuevo es **convertir la
  cantidad+unidad a gramos** antes (función pura de dominio).

### Adherencia (derivada, sin tablas nuevas para esto)

- Función de dominio pura: dada `consumed` (kcal/macros del día) y `target` (meta del plan), devuelve
  un estado `'cumplido' | 'cerca' | 'lejos' | 'sin_registro'` por umbrales sobre calorías.
- Query multi-día: agrega `food_log_items` por fecha (`logged_at::date`) para un rango, devolviendo
  por día los totales consumidos; se cruza con la meta del plan activo.

### Cambios de base de datos

Migración **`0015_nutrition_units.sql`** (idempotente):
- `alter table food_items add column if not exists grams_per_unit numeric;`
- `alter table food_items add column if not exists unit_label text;`
- `alter table food_log_items add column if not exists unit text;`
- `alter table food_log_items add column if not exists quantity numeric;`
- Backfill idempotente: para filas existentes de `food_log_items`, `unit = 'g'` y `quantity = grams`
  donde sean null.
- Seed/append idempotente de `grams_per_unit`/`unit_label` para alimentos comunes públicos por nombre
  (huevo=50, rebanada de pan=30, etc.) sin pisar valores ya puestos.

## Componentes y dónde viven

### Dominio (TS puro + Vitest) — `domain/nutrition/`
- `units.ts` (nuevo): `toGrams(quantity, unit, gramsPerUnit)` → número de gramos; `availableUnits(food)`
  → lista de unidades válidas para un alimento; `formatQuantity(quantity, unit, unitLabel)` → texto
  ("2 huevos", "150 g", "200 ml").
- `adherence.ts` (nuevo): `dayAdherence(consumed, target)` → `'cumplido' | 'cerca' | 'lejos' | 'sin_registro'`;
  umbrales como constantes exportadas (`ADHERENCE_OK = 0.10`, `ADHERENCE_NEAR = 0.25`).
- `calculations.ts` (existente): se reutiliza `calculateFoodMacros` sin cambios.
- Tests: `units.test.ts`, `adherence.test.ts`.

### Schemas — `domain/nutrition/schemas.ts`
- `foodLogItemSchema` gana `unit` (enum `'g'|'ml'|'unit'`, default `'g'`) y `quantity` (positivo). Se
  conserva `grams` (calculado server-side, no se confía del cliente para macros).

### Acciones / queries — `lib/`
- `lib/student/actions.ts` `logFood`: acepta `unit` + `quantity` por item; calcula gramos con
  `toGrams` y luego macros; guarda `unit`/`quantity`/`grams`.
- `lib/coach/actions.ts` `createCustomFood`: acepta `grams_per_unit` + `unit_label` opcionales.
- `lib/db/queries/student-nutrition.ts`: añade `getStudentNutritionRange(studentId, startISO, endISO)`
  → totales consumidos por día + meta, para el calendario y el gráfico.

### UI — `components/` y `app/`
- `components/student/FoodLogForm.tsx`: selector de unidad por línea (g/ml/unidad según el alimento)
  + cantidad; muestra los gramos resultantes.
- `components/coach/FoodForm` (donde se crea el alimento personalizado): campos gramos/unidad +
  etiqueta de unidad (opcionales).
- `components/nutrition/NutritionCalendar.tsx` (nuevo, cliente): semana/mes, estado ✓/⚠/✗/sin
  registro por día, detalle del día con comidas + proteína.
- `components/nutrition/NutritionAdherenceChart.tsx` (nuevo): SVG de tendencia (kcal vs meta + proteína).
- `app/(protected)/student/nutrition/page.tsx` y `app/(protected)/student/meals/page.tsx`: integrar el
  calendario + gráfico.
- `app/(protected)/coach/students/[studentId]/nutrition/page.tsx`: mostrar el calendario de la alumna.

## Flujo de datos

1. Alumna registra comida → elige unidad+cantidad → server convierte a gramos (`toGrams`) → macros
   (`calculateFoodMacros`) → guarda en `food_log_items` (unit, quantity, grams, macros).
2. Calendario/gráfico → `getStudentNutritionRange` agrega por día → `dayAdherence` da el estado →
   `NutritionCalendar` pinta ✓/⚠/✗; `NutritionAdherenceChart` pinta la tendencia.
3. Coach ve el mismo calendario de su alumna (guardas existentes de propiedad).

## Manejo de errores y casos borde

- **Alimento sin `grams_per_unit`:** la opción "unidad" no aparece; solo g/ml.
- **Sin plan activo:** el calendario muestra lo consumido sin meta (estado neutro), no rompe.
- **Día sin comidas:** estado "sin registro" (gris).
- **ml de alimentos densos (aceite):** se asume 1:1; aceptado por decisión de diseño.
- **Compatibilidad:** filas viejas de `food_log_items` se backfillean a `unit='g'`, `quantity=grams`.

## Verificación

- Vitest: `units.test.ts` (g/ml/unidad, alimento sin grams_per_unit), `adherence.test.ts` (umbrales
  ±10/±25, sin registro, sin meta).
- Prueba manual: crear/usar un alimento con unidad (huevo=50g), registrar "2 huevos" → 100g y macros
  correctas; ver el calendario con ✓/⚠/✗; ver el gráfico de tendencia.
- Obligatorio: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

## Fuera de alcance

- Menú planeado día-por-día por el coach.
- Densidad real para ml.
- Dashboard general de progreso animado → Sub-proyecto C.
