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
- `supabase/migrations/0011_exercise_catalog.sql`
- `supabase/migrations/0012_exercise_catalog_seed.sql`
- `lib/constants/exercises.ts`
- `domain/exercises/filter.ts` + `domain/exercises/filter.test.ts` (+ `constants.ts`)
- `components/coach/ExerciseCatalogPicker.tsx`
- `app/(protected)/coach/exercises/[exerciseId]/edit/page.tsx` (si se confirma edición)

**Modificados:**
- `supabase/migrations` (solo añadidos; los existentes no se tocan)
- `lib/coach/actions.ts` (+`addPlanExercises`, +`updatePlanExercise`, +`updateExercise`)
- `lib/validators/coach.ts` (`exerciseSchema` con enums + nuevas categorías; esquema por-ítem)
- `components/coach/ExerciseForm.tsx` (selects + subida de imagen)
- `components/coach/AddPlanExerciseForm.tsx` (reemplazado/complementado por el botón del picker)
- `app/(protected)/coach/workouts/plans/[planId]/page.tsx` (integrar picker + edición inline)
- `app/(protected)/coach/exercises/page.tsx` (filtros + tarjetas)
- `lib/db/queries/workout-plan.ts` (exponer categorías de ejercicio si hace falta en las tarjetas)

---

## 10. Criterios de aceptación

1. Existen ~45 ejercicios globales en español, cada uno con grupo muscular, equipamiento,
   dificultad y patrón de movimiento.
2. Desde un día del plan, la coach abre el catálogo, filtra/busca, marca varios ejercicios,
   configura series/reps/peso de cada uno y los añade todos de una vez.
3. La coach puede editar inline series/reps/peso de un ejercicio ya añadido.
4. El editor de ejercicio permite elegir las 4 categorías desde listas fijas y subir una imagen.
5. La biblioteca `/coach/exercises` se puede filtrar por las 4 categorías y buscar por nombre.
6. Todo respeta RLS, guardas de coach, validación Zod y el diseño "Acero & Escarlata".
7. Tests Vitest de `filterExercises` en verde; `npm run typecheck`, `lint`, `build` sin errores.
