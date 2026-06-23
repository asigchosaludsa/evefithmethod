# Round de pulido UX + demo (Design)

> Round de 6 mejoras aprobado por la dueña el 2026-06-23, a ejecutar en orden
> **2 → 1 → 3 → 5 → 4 → 6**, sin gates de aprobación entre cada una (solo se pausa ante
> decisiones de diseño clave). Cada una se implementa, verifica y despliega por separado.

## #2 — Alumno de prueba (seed de datos ricos)  [PRIMERO]

Crear un estudiante de demostración con ~1 mes de historia para evaluar visualmente toda la app.

- **Cuenta:** auth user vía admin API (`email_confirm: true`), email `demo.alumna@evefitmethod.com`,
  perfil `role='student'`, `status='active'`, `onboarding_completed=true`, vinculado a la coach
  (Evelyn, `OWNER_EMAIL`) en `coach_students`. Password de prueba conocido, se reporta a la dueña.
- **Plan:** PPL + UL (split `ppl_ul` o `personalizado`), días mapeados a weekday, `weeks=5`,
  `starts_at` = hace ~4 semanas. Ejercicios por día con `suggested_weight_kg`.
- **Entrenamiento:** `workout_logs` + `workout_log_sets` por sesión a lo largo de 4-5 semanas, con
  **progresión semanal** (+2.5 kg por ejercicio aprox.), **algunos días completados y otros no**
  (saltados / sin registro) para que el calendario muestre ✓/✗ variado.
- **Peso corporal:** `weight_entries` ~2/semana mostrando tendencia realista hacia una **meta**
  (`student_profiles.goal_weight_kg`), p.ej. bajando suave (recomp). Ring de avance > 0.
- **Medidas:** `body_measurements` al inicio y reciente (cintura baja, etc.) para deltas.
- **Comidas:** `food_logs` + `food_log_items` en varios días, **algunas usando alimentos públicos
  "sugeridos"** y otras personalizadas, con días en meta y días fuera (adherencia variada). Usa las
  nuevas columnas `unit`/`quantity`.
- **Tips:** asignar 1-2 `content_assignments` para que "Hoy" muestre tip.
- **Reversible:** se puede borrar con el panel de cuentas existente. Idempotente: si el email ya
  existe, limpia sus datos y re-siembra (o aborta con aviso).
- **Decisiones por defecto (no bloqueantes):** kg (no lbs); lifts suben, bodyweight baja suave;
  fotos se omiten en el seed (requieren subir binarios; se prueban a mano) salvo que haya placeholder.

## #1 — Navegación rápida (feedback de carga)

- Barra de progreso superior al navegar (componente cliente que escucha cambios de ruta).
- `loading.tsx` con skeletons por sección protegida (coach/student).
- Estado activo/pendiente en el menú lateral.

## #3 — Registro de ejercicio más claro

- En `GuidedWorkoutLogForm`, por ejercicio mostrar etiquetas claras: "Coach asignó: X kg" y
  "Tú la última vez: Y kg", placeholder explícito en el input de peso, y texto guía de que puede
  cambiarlo si hoy usó otro peso. Reusa `lastWeightByExercise` (de A) + `suggested_weight_kg`.

## #5 — Comidas mejoradas

- **Editar/eliminar** una comida registrada (acción server + UI). (Hoy no se puede = bug.)
- **Calendario de comidas** (estilo el de nutrición ya hecho) + vista del día con cada comida (foto,
  macros) y acciones inline.
- Mejor flujo de "registrar hoy".

## #4 — "Hoy" creativo + tips

- Mover el **tip al lado del plan de entrenamiento** (layout de 2 columnas como la 2ª imagen).
- **Animaciones de entrada** escalonadas; tip con más protagonismo, icono/imagen por categoría.
- Imagen/ilustración auto del tip (por categoría) al crearlo.
- Hero "Hoy" más informativo (mini-resumen entreno + nutrición + peso).

## #6 — Fotos de progreso

- Comparador **antes/después** (slider), agrupación por **ángulo** (frente/lado/espalda) y por fecha,
  **línea de tiempo** visual. Mejor sección que el grid actual.

## Verificación (todas)

`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; prueba manual con el alumno de
prueba; deploy a Vercel. Migraciones nuevas (si las hay) vía Management API, en orden.
