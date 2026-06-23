# Sub-proyecto C — Dashboard de Progreso (Design)

> Parte 3 de 3 del overhaul. Hermanos: A (Entrenamiento, DONE) · B (Nutrición, DONE).
> Aprobado por la dueña el 2026-06-23.

## Objetivo

Convertir `/student/progress` (hoy texto plano que "queda en la nada") en un **dashboard dinámico y
animado** que resume el avance: peso (con meta), medidas, entrenamiento y nutrición, visible para la
alumna y la coach. Gráficos en SVG propio (sin librería), animados, respetando reducción de movimiento.

## Problema actual

- `/student/progress` muestra 3 stat cards + listas de texto de peso/medidas + fotos. **Sin gráficos.**
- El registro de peso/medidas funciona (`addWeight`/`addMeasurement`) pero se siente inútil porque no
  hay visualización ni meta; en "Hoy", "Registrar peso" es solo un link sin feedback.
- No hay librería de gráficos. Ya existen datos ricos: peso/medidas (`weight_entries`,
  `body_measurements`), entrenamiento (de A: `workout_log_sets`, racha, progresión) y nutrición
  (de B: adherencia por día).

## Decisiones (acordadas)

1. **Gráficos:** SVG propio animado (CSS), sin librería nueva. Consistente con A y B; sin riesgo con
   React 19.
2. **Meta de peso:** se añade `student_profiles.goal_weight_kg`. El dashboard muestra **% de avance**
   hacia la meta y cuánto falta.
3. **Ubicación:** renovar `app/(protected)/student/progress/page.tsx` (mantener formularios) y reflejar
   el mismo dashboard (solo lectura) en la página de progreso del coach.

## Arquitectura

### Datos (una query agregadora)

`getStudentProgressDashboard(studentId)` reúne:
- **Peso:** serie de `weight_entries` (fecha, kg) ascendente; peso actual (último), primer peso, meta
  (`goal_weight_kg`).
- **Medidas:** primera y última fila de `body_measurements` (para deltas), + serie de cintura.
- **Entrenamiento:** sesiones completadas en los últimos 30 días (`workout_logs` con `session_date` y
  status 'completed'), racha (reusa `currentStreak` de A sobre el plan activo), y top progresión por
  ejercicio (reusa `maxWeightSeries` de A: ejercicios con mayor incremento).
- **Nutrición:** reusa `getStudentNutritionRange` (B) últimos ~14 días → % de días `cumplido`
  (`dayAdherence`) + serie para el mini-gráfico.

### Dominio puro (TS + Vitest) — `domain/progress/`

Reutiliza lo existente (`domain/progress` ya tiene cambio de peso, tendencia, cambio de medidas).
Se añade en un nuevo `goals.ts`:
- `goalProgressPct(firstKg, currentKg, goalKg)` → 0..100 (avance desde el primer peso hacia la meta,
  capado a 0..100, maneja pérdida y ganancia).
- `remainingToGoal(currentKg, goalKg)` → kg que faltan (con signo/absoluto definido).
Y en `progress/training-summary.ts` (o reuso de dominio existente) helpers puros para "días cumplidos
%" (reusa `dayAdherence`) y "top progresión" (transforma series en `{exercise, deltaKg}` ordenado).

### Cambios de base de datos

Migración **`0016_goal_weight.sql`** (idempotente):
- `alter table public.student_profiles add column if not exists goal_weight_kg numeric;`

### Componentes SVG (nuevos) — `components/progress/`

- `GoalProgressRing.tsx`: anillo animado de % a la meta + "te faltan X kg".
- `WeightTrendChart.tsx`: línea animada (stroke-dashoffset) de peso en el tiempo, con la meta marcada
  y el delta total.
- `MeasurementDeltas.tsx`: barras de primera vs última medida por campo (cintura, cadera, pecho,
  muslo, brazo) con flecha de cambio.
- `TrainingSummaryCard.tsx`: sesiones completadas (semana/mes), racha, top progresión (lista).
- `NutritionAdherenceSummary.tsx`: % días cumplidos + mini-gráfico (reusa `NutritionAdherenceChart`
  de B o uno equivalente).

Todos animan con CSS y respetan `@media (prefers-reduced-motion: reduce)`.

### UI / páginas

- `app/(protected)/student/progress/page.tsx`: renovada — hero (peso+meta+racha+nutrición), luego las
  secciones (peso, medidas, entrenamiento, nutrición, fotos) y los formularios existentes
  (`WeightForm`, `MeasurementForm`, foto) con su feedback de éxito ya presente.
- `components/student/ProgressForms.tsx`: añadir un campo opcional de **meta de peso** (o un pequeño
  form aparte) que guarde `goal_weight_kg` vía una acción nueva.
- `lib/student/actions.ts`: `setGoalWeight` (o ampliar `updateStudentProfile`) para persistir
  `goal_weight_kg`.
- `app/(protected)/coach/students/[studentId]/progress/page.tsx`: render del mismo dashboard (solo
  lectura) para la alumna seleccionada.

## Flujo de datos

1. Página de progreso (alumna o coach) → `getStudentProgressDashboard(studentId)` → objeto con
   peso/medidas/entrenamiento/nutrición/meta.
2. Componentes SVG pintan y animan a partir de ese objeto.
3. La alumna registra peso/medidas/meta con los formularios → server actions → revalida → el
   dashboard se actualiza.

## Manejo de errores y casos borde

- **Sin datos:** cada tarjeta muestra un estado vacío amable ("registra tu primer peso…"), no rompe.
- **Sin meta:** el anillo de meta invita a fijarla; el resto del dashboard funciona.
- **1 solo registro de peso:** la línea muestra el punto; el delta es 0.
- **Pérdida vs ganancia de peso:** `goalProgressPct` maneja ambos sentidos (si la meta es menor que el
  primer peso = bajar; si es mayor = subir).
- **Permisos:** la alumna ve lo suyo; la coach ve solo a sus alumnas (guardas existentes de la página).

## Verificación

- Vitest: `goals.test.ts` (% avance subiendo y bajando, cap 0..100, sin meta), y los helpers de
  resumen (top progresión, % días cumplidos).
- Prueba manual: fijar meta → ver el anillo; registrar peso → verlo en la línea y el % moverse; ver
  resumen de entrenamiento (racha/sesiones) y nutrición (% días). Coach ve el dashboard de su alumna.
- Obligatorio: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

## Fuera de alcance

- Correlaciones automáticas (peso vs volumen de entrenamiento) y alertas → posible v2.
- Edición de medidas/peso por parte del coach (hoy la coach solo ve progreso) → v2.
