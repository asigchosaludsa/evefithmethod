# Diseño — Catálogo de ejercicios categorizado + selector visual de asignación

**Fecha:** 2026-06-22
**Proyecto:** EveFit Method
**Autor:** sesión de brainstorming con la dueña (coach)

---

## 1. Problema y objetivo

Hoy la coach asigna ejercicios a una alumna **de uno en uno** mediante un `<select>` simple
dentro de cada día del plan (`components/coach/AddPlanExerciseForm.tsx`). No hay forma de
explorar la biblioteca por categorías, ni buscar, ni ver los ejercicios visualmente, ni añadir
varios a la vez. Además, `muscle_group` y `equipment` son **texto libre**, así que no se puede
filtrar de forma fiable.

**Objetivo:** que la coach pueda (1) explorar un catálogo amplio de ejercicios comunes de gimnasio
en español, categorizados; (2) filtrarlos/buscarlos visualmente; (3) **seleccionar varios de
golpe** y, recién después, configurar series/reps/peso de cada uno y añadirlos todos al día.

---

## 2. Decisiones tomadas (brainstorming)

| Tema | Decisión |
|---|---|
| Flujo de asignación | **Catálogo + configuración por lotes** (elegir todos → configurar → añadir) |
| Dimensiones de categoría | **Las 4**: grupo muscular, equipamiento, dificultad, patrón de movimiento |
| Tamaño del catálogo | **Curado ~40-50** ejercicios |
| Imágenes | **Subida de imágenes reales** + **ícono por grupo muscular como fallback** |
| Propiedad de los ejercicios | **Globales** (`is_global = true`, `status = 'published'`) |

**Fuera de alcance v1:** subida masiva de imágenes (se suben una a una), reordenar ejercicios por
drag-and-drop.

### 2.1 Splits de entrenamiento (añadido)

Al **crear un plan**, la coach elige un **split**. El split genera automáticamente los **días** del
plan con su título y enfoque; luego la coach rellena cada día con el catálogo. El **alumno ve el
split y la estructura** en su parte de entrenamiento. El enfoque de cada día **pre-marca los
filtros** del catálogo al añadir ejercicios. Todo en español.

Pre-filtro confirmado: **sí**.

---

## 3. Modelo de datos

### 3.1 Categorías canónicas (constantes TS)

Nuevo archivo `lib/constants/exercises.ts` con las listas canónicas, fuente de verdad para selects,
chips de filtro y validación Zod:

- **Grupo muscular** (`muscle_group`): `Glúteos`, `Cuádriceps`, `Femoral`, `Espalda`, `Pecho`,
  `Hombros`, `Bíceps`, `Tríceps`, `Core`, `Gemelos`, `Cuerpo completo`, `Cardio`.
- **Equipamiento** (`equipment`): `Barra`, `Mancuernas`, `Máquina`, `Polea`, `Peso corporal`,
  `Banda elástica`, `Kettlebell`, `Smith`, `Banco`.
- **Dificultad** (`difficulty`): `principiante`, `intermedio`, `avanzado`.
- **Patrón de movimiento** (`movement_pattern`): `empuje`, `tracción`, `dominante_cadera`,
  `dominante_rodilla`, `core`.

### 3.2 Migración `0011_exercise_catalog.sql`

- `alter table public.exercises add column difficulty text check (difficulty in
  ('principiante','intermedio','avanzado'))` (nullable).
- `alter table public.exercises add column movement_pattern text check (movement_pattern in
  ('empuje','tracción','dominante_cadera','dominante_rodilla','core'))` (nullable).
- `muscle_group` y `equipment` se mantienen como `text` (no se añade CHECK para no romper datos
  existentes ni la creación libre); la normalización se garantiza en la capa de app (Zod enum) y en
  el seed.
- **Normaliza** los 10 ejercicios ya sembrados a los valores canónicos (p. ej. `Femorales` →
  `Femoral`, `Mancuernas` → `Mancuernas` ya ok, `Cuádriceps` ok) mediante `update`.
- Nuevo bucket de Storage **`exercise-images`** (público de lectura, escritura del dueño por
  carpeta `<coach_uuid>/<archivo>`), siguiendo el patrón de `avatars` en `0006_storage.sql`.
  Reutiliza la columna existente `thumbnail_url` para guardar la URL pública de la imagen (no se
  añade columna nueva).

### 3.3 Migración `0012_exercise_catalog_seed.sql`

`insert ... on conflict do nothing` con ~45 ejercicios globales en español, cada uno con
`name`, `muscle_group`, `equipment`, `difficulty`, `movement_pattern`, `description`,
`status='published'`, `is_global=true`. Idempotente, va por migración (no solo seed.sql) para que
aterrice de forma fiable en producción. Cobertura repartida por los 12 grupos musculares.

> Los ejercicios sembrados arrancan **sin imagen** (muestran el ícono de su grupo muscular). La
> coach sube fotos reales cuando quiera desde el editor de ejercicio.

---

## 3.4 Splits — modelo de datos

- Migración `0011`: `alter table public.workout_plans add column split_type text` con CHECK en los
  valores canónicos: `cuerpo_completo`, `torso_pierna`, `ppl`, `ppl_doble`, `bro_split`,
  `torso_extremidades`, `ppl_ul`, `arnold`, `phul`, `phat`, `ppl_arnold`, `personalizado`
  (nullable; los planes existentes quedan `NULL` = sin split asignado).
- **No** se añade tabla nueva para los días del split: se reutiliza `workout_plan_days`. El split es
  solo una **plantilla** que decide qué filas de `workout_plan_days` se crean al generar el plan.

### Plantillas de split (constante TS)

Nuevo archivo `lib/constants/splits.ts` con `SPLIT_TEMPLATES`: por cada split, `{ key, label,
english, days: [{ title, focus, muscleGroups[] }] }`. `muscleGroups` usa los valores canónicos de
grupo muscular (sección 3.1) y alimenta el pre-filtro del catálogo.

| key | label (ES) | días |
|---|---|---|
| `cuerpo_completo` | Cuerpo completo | 3 (cuerpo completo ×3) |
| `torso_pierna` | Torso / Pierna | 4 (Torso, Pierna, Torso, Pierna) |
| `ppl` | Empuje / Tracción / Pierna | 3 (Empuje, Tracción, Pierna) |
| `ppl_doble` | PPL doble | 6 (Empuje, Tracción, Pierna ×2) |
| `bro_split` | Por grupo muscular | 5 (Pecho, Espalda, Pierna, Hombros, Brazos) |
| `torso_extremidades` | Torso / Extremidades | 4 (Torso, Extremidades, Torso, Extremidades) |
| `ppl_ul` | PPL + Torso/Pierna | 5 (Empuje, Tracción, Pierna, Torso, Pierna) |
| `arnold` | Arnold | 6 (Pecho y Espalda, Hombros y Brazos, Pierna ×2) |
| `phul` | Fuerza-Hipertrofia T/P (PHUL) | 4 (Torso fuerza, Pierna fuerza, Torso hiper., Pierna hiper.) |
| `phat` | Powerbuilding (PHAT) | 5 (Torso fuerza, Pierna fuerza, Espalda/Hombros hiper., Pierna hiper., Pecho/Brazos hiper.) |
| `ppl_arnold` | PPL + Arnold | 6 (Empuje, Tracción, Pierna, Pecho y Espalda, Hombros y Brazos, Pierna) |
| `personalizado` | Personalizado | N días que define la coach manualmente |

> Las composiciones siguen las referencias estándar (Hevy, StrengthLog, Legion, Boostcamp).

### Flujo de creación con split

- `WorkoutPlanForm` gana un selector de **split** (tarjetas/lista con nombre, equivalente en
  inglés y nº de días). Al crear:
  - Split ≠ `personalizado`: la action `createWorkoutPlan` guarda `split_type` y **genera los
    `workout_plan_days`** desde la plantilla (título + focus, `day_number` correlativo).
  - Split = `personalizado`: guarda `split_type='personalizado'` y **no** crea días; la coach los
    añade con el flujo manual actual (`addWorkoutDay`).
- En el constructor del plan, cada día muestra su enfoque; el botón "+ Añadir ejercicios" abre el
  catálogo con los filtros **pre-marcados** según `muscleGroups` del día (la coach puede quitarlos).

### Visibilidad para el alumno

- `lib/db/queries/workout-plan.ts` expone `split_type`. La vista `app/(protected)/student/workout`
  muestra una etiqueta legible del split (vía `SPLIT_TEMPLATES[key].label`) y la estructura de días.

## 4. Capa de dominio (`/domain/exercises/`, Vitest)

Lógica pura testeable, siguiendo la convención del proyecto:

- `constants.ts` — reexporta/define las listas canónicas y los íconos por grupo muscular.
- `filter.ts` — `filterExercises(exercises, { query, muscleGroup, equipment, difficulty,
  movementPattern })`: función pura que aplica búsqueda por nombre (case/acento-insensible) +
  filtros por categoría. Devuelve la lista filtrada.
- Tests en `filter.test.ts`: búsqueda, cada filtro, combinación de filtros, lista vacía.

---

## 5. Selector visual — `ExerciseCatalogPicker`

Componente cliente nuevo `components/coach/ExerciseCatalogPicker.tsx`, abierto como **modal a
pantalla grande** desde un botón **"+ Añadir ejercicios"** en cada día del plan
(`app/(protected)/coach/workouts/plans/[planId]/page.tsx`).

**Paso 1 — Elegir (multi-selección):**
- Input de búsqueda por nombre.
- Chips de filtro para las 4 dimensiones (un valor activo por dimensión, toggle).
- Grid responsive de tarjetas: imagen (o ícono fallback por grupo muscular), nombre, `grupo · equipo`,
  badge de dificultad. Click marca/desmarca (tick escarlata + borde).
- Contador "N elegidos".

**Paso 2 — Configurar:**
- Lista de los ejercicios marcados; por cada uno: `sets` (def. 3), `reps` (def. "10"),
  `suggested_weight_kg`, `rest_seconds`, `tempo`, `notes`.
- Botón **"Añadir N ejercicios al día"** → server action `addPlanExercises`.

Diseño "Acero & Escarlata" (escarlata `#FF3B47`, acero oscuro). Reutiliza estilos existentes.

---

## 6. Server actions (`lib/coach/actions.ts`)

- **`addPlanExercises(input)`** — nueva. Recibe `{ workout_plan_id, workout_plan_day_id, items[] }`,
  donde cada item es `{ exercise_id, sets, reps, rest_seconds?, tempo?, suggested_weight_kg?,
  notes? }`. Valida cadena de propiedad (`assertCoachOwnsStudent` vía plan→student) y cada item con
  el `planExerciseNumbersSchema` existente (sets 1-20, reps texto, rest 0-3600, peso 0-1000).
  Inserción en lote respetando `sort_order` autoincremental. Revalida la página del plan.
- **`updatePlanExercise(input)`** — nueva. Edición inline de un ejercicio ya añadido
  (`sets`/`reps`/`suggested_weight_kg`/`rest_seconds`/`tempo`/`notes`). Misma validación y guardas.
- Se conserva `addPlanExercise` (singular) y `deletePlanExercise` actuales.

La validación se centraliza: extraer el esquema por-ítem a `domain/workouts/schemas.ts` o
`lib/validators/coach.ts` y reutilizarlo en singular, plural y update.

- **`createWorkoutPlan`** (modificada) — `workoutPlanSchema` añade `split_type` (`z.enum` de los 12
  valores, opcional). Tras insertar el plan, si `split_type` ≠ `personalizado` y ≠ vacío, genera en
  lote los `workout_plan_days` desde `SPLIT_TEMPLATES`. Mantiene las guardas actuales.

---

## 7. Editor de ejercicios y biblioteca

- **`components/coach/ExerciseForm.tsx`**: los campos `muscle_group` y `equipment` pasan de texto
  libre a `<select>` con las listas canónicas; se añaden selects para `difficulty` y
  `movement_pattern`; se añade **subida de imagen** al bucket `exercise-images` (escribe
  `thumbnail_url`). El editor sirve para crear y editar.
- **`exerciseSchema`** (`lib/validators/coach.ts`): `muscle_group`/`equipment` pasan a `z.enum`
  (con las listas canónicas) opcionales; se añaden `difficulty` y `movement_pattern` como
  `z.enum` opcionales.
- **`app/(protected)/coach/exercises/page.tsx`** (biblioteca): reusa los chips de filtro + tarjetas
  del picker para explorar cómodamente (mismo look, sin multi-selección/configuración).
- Crear página/acción de **editar ejercicio** (hoy solo hay crear + detalle):
  `/coach/exercises/[exerciseId]/edit` reutilizando `ExerciseForm` + action `updateExercise`.
  **Decisión:** dado que hay una sola coach, la coach puede editar tanto sus ejercicios propios
  como los globales (la guarda es `requireCoach`). Esto permite que complete categorías e imágenes
  del catálogo sembrado.

---

## 8. Seguridad y restricciones (respetadas)

- Guardas `requireCoach` / `assertCoachOwnsStudent` en todas las mutaciones nuevas.
- Validación Zod server-side en `addPlanExercises` / `updatePlanExercise` / `updateExercise`.
- Bucket `exercise-images`: lectura pública, escritura solo en la carpeta propia del coach; límites
  de MIME/tamaño en línea con `0007_storage_limits.sql` (jpg/jpeg/png/webp, ~5MB).
- Migraciones aplicadas **en orden** (`0011`, luego `0012`).
- Diseño "Acero & Escarlata" respetado. No se tocan pagos/IA/chat. No se borran archivos sin
  inspeccionar.

---

## 9. Archivos afectados (resumen)

**Nuevos:**
- `supabase/migrations/0011_exercise_catalog.sql` (columnas ejercicio + `split_type` + bucket)
- `supabase/migrations/0012_exercise_catalog_seed.sql`
- `lib/constants/exercises.ts`
- `lib/constants/splits.ts` (`SPLIT_TEMPLATES`)
- `domain/exercises/filter.ts` + `domain/exercises/filter.test.ts` (+ `constants.ts`)
- `domain/workouts/splits.ts` + `splits.test.ts` (resolver plantilla → días; función pura)
- `components/coach/ExerciseCatalogPicker.tsx`
- `app/(protected)/coach/exercises/[exerciseId]/edit/page.tsx`

**Modificados:**
- `supabase/migrations` (solo añadidos; los existentes no se tocan)
- `lib/coach/actions.ts` (+`addPlanExercises`, +`updatePlanExercise`, +`updateExercise`;
  `createWorkoutPlan` genera días desde el split)
- `lib/validators/coach.ts` (`exerciseSchema` con enums + categorías; esquema por-ítem)
- `domain/workouts/schemas.ts` (`workoutPlanSchema` + `split_type`)
- `components/coach/ExerciseForm.tsx` (selects + subida de imagen)
- `components/coach/WorkoutPlanForm.tsx` (selector de split)
- `components/coach/AddPlanExerciseForm.tsx` (reemplazado/complementado por el botón del picker)
- `app/(protected)/coach/workouts/plans/[planId]/page.tsx` (integrar picker + edición inline + pre-filtro)
- `app/(protected)/coach/exercises/page.tsx` (filtros + tarjetas)
- `app/(protected)/student/workout/page.tsx` (mostrar split + estructura)
- `lib/db/queries/workout-plan.ts` (exponer categorías de ejercicio y `split_type`)

---

## 10. Criterios de aceptación

1. Existen ~45 ejercicios globales en español, cada uno con grupo muscular, equipamiento,
   dificultad y patrón de movimiento.
2. Desde un día del plan, la coach abre el catálogo, filtra/busca, marca varios ejercicios,
   configura series/reps/peso de cada uno y los añade todos de una vez.
3. La coach puede editar inline series/reps/peso de un ejercicio ya añadido.
4. El editor de ejercicio permite elegir las 4 categorías desde listas fijas y subir una imagen.
5. La biblioteca `/coach/exercises` se puede filtrar por las 4 categorías y buscar por nombre.
6. Al crear un plan, la coach elige uno de los 11 splits (o Personalizado); los días se generan
   automáticamente con su enfoque (salvo Personalizado). El alumno ve el split y la estructura.
7. Al añadir ejercicios desde un día con enfoque, los filtros del catálogo vienen pre-marcados.
8. Todo respeta RLS, guardas de coach, validación Zod y el diseño "Acero & Escarlata".
9. Tests Vitest de `filterExercises` y de la resolución de splits en verde; `npm run typecheck`,
   `lint`, `build` sin errores.
