# Sub-proyecto A — Entrenamiento: completado real + progresión (Design)

> Spec de diseño. Parte 1 de 3 de la revisión de progreso/entrenamiento/nutrición.
> Hermanos: B (Nutrición: unidades + calendario), C (Dashboard de Progreso).
> Aprobado por la dueña el 2026-06-22.

## Objetivo

Que registrar el entrenamiento **funcione de verdad y se sienta bien**: una sola fuente de
verdad para "completado", el calendario refleja lo hecho por ejercicio (✓/✗), "Hoy te toca" deja
de pedir lo que ya se hizo y muestra una celebración, y la alumna y la coach ven la progresión de
peso de cada ejercicio.

## Problema actual (causa raíz)

Hoy existen **dos sistemas de completado desconectados** que escriben en `workout_logs`:

1. **Calendario** (`toggleSessionStatus` en `lib/workouts/session-actions.ts`): inserta filas con
   `session_date = <fecha>`. El calendario (`lib/db/queries/training-calendar.ts`) **solo lee filas
   con `session_date IS NOT NULL`**.
2. **Registro detallado** (`logWorkout` en `lib/student/actions.ts`): inserta una fila con
   `session_date = NULL` + filas en `workout_log_sets`. El calendario nunca las ve.

Consecuencias observadas:
- Marcar ejercicios y "Guardar entrenamiento" no aparece en el calendario (queda con `session_date = NULL`).
- "Hoy te toca" (`app/(protected)/student/today/page.tsx`) decide solo por el día de la semana del
  plan (`buildCalendar`), **nunca consulta `workout_logs`** → sigue diciendo "Hoy te toca ..." aunque
  ya completaste o marcaste el día.
- No hay vista de progresión por ejercicio ni se sugiere el último peso usado.

## Decisiones (acordadas con la dueña)

1. **Modelo de completado:** una sola fuente de verdad. Registrar los ejercicios del día completa
   ese día automáticamente. El calendario muestra ✓/✗ por ejercicio. Se mantienen botones rápidos
   "Marcar todo hecho" y "No entrené hoy" para cuando no se quiere meter detalle.
2. **Peso al registrar:** el campo se rellena con el **último peso que la alumna usó** en ese
   ejercicio; al lado se muestra, en gris, el **sugerido del coach** y una mini-tendencia.
3. **Métrica de progresión por ejercicio:** **peso máximo levantado** en el tiempo (línea/barras
   ascendentes).
4. **Coach:** control total — puede marcar el día (hecho/no hecho) **y** entrar al detalle a
   registrar/corregir peso y reps de cada ejercicio en nombre de la alumna.
5. **Celebración:** estilo **anillo de progreso al 100% + racha** (variante B del mockup), con el
   desglose ✓/✗ por ejercicio debajo.

## Arquitectura

### Fuente de verdad: sesión por `(student_id, workout_plan_day_id, session_date)`

- **Toda** escritura de una sesión (detallada o rápida) usa `workout_logs` con `session_date`
  **no nulo** (la fecha de la sesión; por defecto hoy). Se elimina el patrón `session_date = NULL`.
- El índice único parcial existente
  `workout_logs_session_uidx (student_id, workout_plan_day_id, session_date) where session_date is not null`
  garantiza una sola fila por sesión → se hace **upsert** (buscar existente → update; si no, insert).
- `workout_logs.status`: `'completed' | 'skipped'`. Se deriva/asigna así:
  - Registro detallado o "Marcar todo hecho" → `'completed'`.
  - "No entrené hoy" → `'skipped'`.
- `workout_log_sets` (hijo de `workout_logs`): una fila por set con `exercise_id`, `set_number`,
  `reps_completed`, `weight_kg`, `completed`. Al re-registrar una sesión existente se **reemplazan**
  los sets de esa sesión (delete + insert dentro de la misma operación) para evitar duplicados.

### Estado por ejercicio (✓/✗) — derivado, sin columnas nuevas

- Un ejercicio de la sesión está **hecho (✓)** si tiene al menos un set con `completed = true`;
  **no hecho (✗)** si está en el plan del día pero no tiene ningún set completado en esa sesión.
- El calendario cruza los ejercicios del plan del día (`workout_plan_exercises`) con los
  `workout_log_sets` de esa sesión para pintar ✓/✗.

### Cambios de base de datos

**Ninguna tabla nueva.** Migración `0014` solo si hace falta un índice de apoyo para las consultas
de progresión (`workout_log_sets` por `exercise_id`); si el rendimiento es aceptable con los índices
actuales, `0014` puede ser un no-op documentado. No se rompen datos existentes (las filas viejas con
`session_date = NULL` quedan como historial "suelto"; opcionalmente una sentencia idempotente puede
backfillear `session_date = date(logged_at)` para las que tengan `workout_plan_day_id`).

## Componentes y dónde viven

### Dominio (TS puro + Vitest) — `domain/workouts/`
- `progression.ts` (nuevo): `maxWeightPerSession(sets, sessions)` → serie [{dateISO, maxKg}] por
  ejercicio; `lastWeightForExercise(sets)` → último peso registrado; `exerciseStatus(planExercises, sets)`
  → mapa exerciseId → 'done' | 'missed'.
- `streak.ts` (nuevo): `currentStreak(scheduledSessions, statusByKey, todayISO)` → entero. Cuenta
  sesiones **programadas** completadas consecutivas hacia atrás desde la última programada ≤ hoy; un
  día de descanso no rompe; una sesión programada pasada sin completar rompe.
- `calendar.ts` (existente): se reutiliza `buildCalendar`. Se añade, si hace falta, un helper para
  saber la última sesión programada ≤ hoy.
- Tests nuevos: `progression.test.ts`, `streak.test.ts`.

### Acciones / queries — `lib/`
- `lib/student/actions.ts`: `logWorkout` modificado para (a) escribir `session_date` (hoy por
  defecto, o la fecha pasada), (b) hacer upsert de la sesión, (c) reemplazar sets. Status `'completed'`.
- `lib/workouts/session-actions.ts`: `toggleSessionStatus` se mantiene para los botones rápidos
  (marcar todo hecho / no entrené); alineado al mismo upsert.
- `lib/coach/actions.ts`: nueva acción para que la coach registre/corrija la sesión de una alumna
  (autoriza con `assertCoachOwnsStudent`, usa admin client). Reusa la misma lógica de upsert que
  `logWorkout` (extraída a un helper compartido en `lib/workouts/` para no duplicar).
- `lib/db/queries/training-calendar.ts`: `getTrainingCalendarData` amplía su retorno con los sets por
  sesión para derivar ✓/✗ por ejercicio.
- `lib/db/queries/exercise-progression.ts` (nuevo): serie de peso máximo por ejercicio para una alumna.

### UI — `components/` y `app/`
- `app/(protected)/student/today/page.tsx`: consulta el estado de la sesión de hoy; si está
  completada/skipped, renderiza la celebración; si no, "Hoy te toca + Registrar".
- `components/workouts/SessionCompleteCard.tsx` (nuevo): anillo 100% + racha + desglose ✓/✗.
  Animaciones con CSS, con `@media (prefers-reduced-motion: reduce)`.
- `components/student/GuidedWorkoutLogForm.tsx`: prefill del último peso por ejercicio; muestra
  sugerido del coach y mini-tendencia; al guardar usa el `logWorkout` actualizado.
- `components/workouts/ExerciseProgressChart.tsx` (nuevo): mini-gráfico de peso máximo por ejercicio.
- `components/workouts/TrainingCalendar.tsx`: pinta ✓/✗ por ejercicio en el detalle del día; usa el
  estado derivado; botones rápidos.
- `app/(protected)/coach/students/[studentId]/calendar/page.tsx`: habilita edición del coach (marcar
  día + abrir detalle para registrar/corregir).

## Flujo de datos

1. Alumna abre Hoy → se consulta la sesión de hoy `(student_id, planDayId, todayISO)` + sus sets.
2. Si hay sesión `completed`/`skipped` → `SessionCompleteCard` (racha calculada en dominio).
3. Si no → "Hoy te toca"; al registrar, `GuidedWorkoutLogForm` precarga últimos pesos y guarda vía
   `logWorkout` (upsert sesión + reemplazo de sets, `session_date = hoy`).
4. Calendario lee plan + logs + sets → ✓/✗ por ejercicio + estado del día.
5. Tocar un ejercicio → `ExerciseProgressChart` con la serie de peso máximo.
6. Coach: misma data; sus acciones pasan por `assertCoachOwnsStudent` + admin client.

## Manejo de errores y casos borde

- **Día programado pasado sin registrar:** estado "sin registrar" (gris neutro). No se auto-marca
  como fallado en la UI de la alumna; rompe la racha para el cálculo. La coach puede marcarlo.
- **Re-registrar una sesión ya guardada:** upsert + reemplazo de sets (no duplica).
- **Ejercicio sin historial:** prefill vacío; tendencia muestra "sin datos aún".
- **Plan sin `weekday`/`starts_at`/`weeks`:** se respeta el comportamiento actual de `buildCalendar`
  (no se rompe; simplemente no hay día programado).
- **Permisos:** alumna solo su propia sesión; coach solo alumnas propias (guardas existentes).

## Verificación

- Vitest: `progression.test.ts`, `streak.test.ts` (incluye casos: racha con descansos, racha rota,
  peso máximo con sets variados, estado hecho/no hecho).
- Prueba manual E2E (local): registrar sesión → celebración en Hoy → ✓/✗ en calendario → coach edita
  un peso → tendencia del ejercicio sube. Verificar que "Hoy te toca" ya no reaparece tras completar.
- Obligatorio antes de declarar hecho: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

## Fuera de alcance (otros sub-proyectos)

- Dashboard general de progreso animado (peso, medidas, resumen) → Sub-proyecto C.
- Nutrición: unidades (g/ml/unidades) y calendario nutricional → Sub-proyecto B.
- Alertas automáticas de sesiones perdidas, notas por día, mover día → posible v2.
