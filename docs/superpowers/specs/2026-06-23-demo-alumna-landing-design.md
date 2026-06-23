# Demo de alumna en la landing (Design)

> Aprobado por la dueña el 2026-06-23. Se construye en 2 fases: (1) sandbox efímero
> (backend), (2) integración + animaciones en la landing. La fase 2 depende de la 1.

## Objetivo

Que cualquier visitante de la landing pueda **entrar a una demo como alumna** con un clic y un
sandbox aislado: ve los datos ricos del alumno demo, puede hacer lo que quiera (registrar, editar,
crear) y todo vive solo en su sesión; al salir o a las pocas horas su copia se borra. El alumno demo
"maestro" queda intacto para el siguiente visitante. Además, modernizar la landing con animaciones
profesionales (scroll-reveal de mini-previews + micro-interacciones en botones).

## Decisiones (acordadas)

1. **Aislamiento:** sandbox **efímero por visitante** (copia desechable de los datos del demo).
2. **Previews:** **mezcla** — mini-previews diseñadas (fieles a la app) para el scroll + 1 panel
   grande destacado.
3. **Expiración:** ~3h; cron de limpieza; borrado inmediato al "Salir de la demo".
4. **Abuso:** Turnstile + rate-limit por IP en el endpoint de inicio.
5. **Orden:** Fase 1 sandbox (backend) → Fase 2 landing (visual).

## Arquitectura — Fase 1: sandbox efímero

### Modelo de datos
- Migración **`0017_demo_sessions.sql`** (idempotente):
  - `profiles.is_demo boolean not null default false`
  - `profiles.demo_expires_at timestamptz`
  - Función `public.clone_demo_student(template_id uuid, new_id uuid)` (SECURITY DEFINER, search_path
    fijado): copia a `new_id` todas las filas del estudiante plantilla remapeando ids:
    `student_profiles`, `coach_students` (mismo coach), `workout_plans`→`workout_plan_days`→
    `workout_plan_exercises`, `workout_logs`→`workout_log_sets`, `weight_entries`,
    `body_measurements`, `food_logs`→`food_log_items`, `content_assignments`. Genera UUIDs nuevos
    para PKs y mantiene las relaciones (mapea plan_id/day_id/log_id viejos→nuevos). NO copia
    `progress_photos` en v1 (la plantilla no tiene). NO copia `coach_notes`.
  - Índice parcial para limpieza: `create index ... on profiles (demo_expires_at) where is_demo`.

### Identidad del demo maestro
- El `OWNER`/config necesita el id del alumno plantilla. Se resuelve por email
  `demo.alumna@evefitmethod.com` en el endpoint (no hardcodear el uuid).

### Endpoints (App Router route handlers)
- **`POST /api/demo/start`**: 
  1. Verifica Turnstile (server siteverify) + rate-limit por IP (`lib/security/rate-limit`).
  2. Resuelve el id de la plantilla (profile por email demo).
  3. Crea cuenta desechable vía admin: `demo+<uuid>@demo.evefitmethod.com`, password aleatorio,
     `email_confirm: true`.
  4. Fija el perfil (bypass trigger de rol vía `set_config('request.jwt.claims', service_role)` en una
     transacción, igual que el seed): `role='student'`, `status='active'`,
     `onboarding_completed=true`, `full_name='Tú (demo)'`, `is_demo=true`,
     `demo_expires_at = now()+ interval '3 hours'`.
  5. `clone_demo_student(templateId, newId)`.
  6. Inicia sesión server-side con esa cuenta (`@supabase/ssr` `signInWithPassword` en el route
     handler, setea cookies) y redirige a `/student/today`.
- **`POST /api/demo/end`**: si el perfil actual `is_demo`, cierra sesión y borra la cuenta vía admin
  (cascada borra todos sus datos). Redirige a `/` (landing).
- **`GET/POST /api/cron/cleanup-demos`**: protegido con `CRON_SECRET` (header o query, patrón del cron
  existente). Borra (admin) los `profiles` con `is_demo = true and demo_expires_at < now()` (cascada).
  Configurar en `vercel.json` (o el mecanismo de cron existente) cada hora.

### Banner de modo demo
- `components/student/DemoBanner.tsx`: barra fija superior visible cuando el perfil es `is_demo`,
  texto "Estás explorando como alumna · lo que hagas no se guarda" + botón "Salir de la demo" (POST a
  `/api/demo/end`). Montado en el layout protegido, condicional a `profile.is_demo`.
- Seguridad: una cuenta demo nunca escala a coach (trigger de rol intacto); RLS aísla cada copia.

## Arquitectura — Fase 2: landing (visual)

### Integración
- **Hero:** botón secundario "Echa un vistazo — entra como alumna →" (junto al CTA principal). Dispara
  el flujo de demo (un pequeño form/botón que postea a `/api/demo/start` con el token Turnstile, o un
  botón que abre un mini-modal con el widget Turnstile si hace falta el token antes del POST).
- **Sección "Míralo por dentro"** (entre features y CTA final): grid/carrusel de mini-previews +
  1 panel grande destacado + repetición del CTA de demo.

### Mini-previews (componentes fieles, livianos)
- `components/landing/PreviewCards.tsx` (o varios): miniaturas construidas con el diseño real:
  anillo de "sesión completada", calendario ✓/✗, dashboard con anillo de meta + línea de peso,
  calendario de comidas con estados, galería. SVG/HTML, sin datos en vivo (mock estático coherente).

### Animaciones (sin librería nueva)
- `components/landing/Reveal.tsx`: wrapper cliente con IntersectionObserver que aplica fade + zoom +
  parallax sutil al entrar y atenúa al salir; escalonado por índice; curvas `ease-out-expo`; blur sutil
  en transición. `prefers-reduced-motion` → sin movimiento (contenido visible por defecto, nunca
  gateado por JS).
- Micro-interacciones de botones: escala al `:active`, sheen al hover, sombra teñida escarlata; el CTA
  de demo con pulse sutil. Vía CSS (clases utilitarias en `globals.css`), reduced-motion safe.

## Manejo de errores y casos borde
- Turnstile inválido / rate-limit excedido → mensaje claro, no crea cuenta.
- Si la plantilla no existe → error controlado ("demo no disponible").
- Si el visitante ya tiene una sesión demo activa (cookie) → reutilizar o crear nueva (crear nueva es
  más simple; el cron limpia).
- Clonado idempotente a nivel de función (cada llamada crea un set nuevo bajo `new_id`).
- El cron es fail-safe: si falla, las cuentas viven más, pero `demo_expires_at` permite reintento.

## Verificación
- Prueba manual: landing → "entrar como alumna" → entra con datos → registrar/editar algo → "Salir"
  → re-entrar → la plantilla (vista del coach) sigue intacta; verificar que dos sesiones demo no se
  ven entre sí; ejecutar el cron y ver que borra expiradas.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; migración 0017 vía Management
  API; deploy.

## Fuera de alcance
- Clonar fotos de progreso (v1 sin fotos en la plantilla).
- Convertir la demo en cuenta real ("regístrate para guardar tu progreso") → posible v2 (gancho de
  conversión).
- Límite global de cuentas demo concurrentes (rate-limit por IP es suficiente para v1).
