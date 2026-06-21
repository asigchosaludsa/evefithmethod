# Próximos pasos — EveFit Method

Esta guía describe en qué estado está la plataforma hoy, qué conviene construir a continuación y qué hay que dejar listo antes de salir a producción. Está pensada para que la dueña del proyecto siga los pasos aunque no sea experta técnica.

EveFit Method es una **plataforma web responsive** (no es app nativa) de coaching de fitness y nutrición: una coach gestiona a sus alumnas. La idea central es simple: **la alumna sabe qué tiene que hacer hoy; la coach sabe a quién revisar hoy.**

---

## Resumen rápido

- **Fase 1 — Completada.** La plataforma está construida de punta a punta: autenticación, base de datos con RLS, los dos portales (coach y alumna), la lógica de dominio, el sistema de diseño y la documentación.
- **Fase 2 — Recomendada a continuación.** Conectar correo real (SMTP), correos de invitación, constructor de planes de entrenamiento por día/ejercicio, interfaz para subir fotos de comidas, interfaz para asignar contenido, acciones de revisión de la coach y rate limiting + CAPTCHA.
- **Fase 3 — Futuro.** Pagos con Stripe, asistencia con IA, push/PWA, app nativa y soporte multi-coach.
- **Antes de producción.** Revisión legal, SMTP propio, checklist de seguridad, monitoreo (Sentry), copias de seguridad.

---

## Fase 1 — Completada (lo que ya existe)

Todo lo siguiente ya está implementado en el repositorio. No hay que volver a construirlo; sirve como base para las fases siguientes.

### Stack tecnológico

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (modo estricto).
- **Tailwind CSS v4** con el sistema de diseño oscuro **"Acero & Escarlata"** (escarlata `#FF3B47`, acero oscuro, blanco).
- **Supabase** (Auth, Postgres, Storage) a través de `@supabase/ssr`.
- **Zod v4** para validación + **React Hook Form** para formularios.
- **Vitest** para pruebas. Gestor de paquetes: **npm**.

> Nota técnica: Next.js 16 usa `proxy.ts` en lugar de `middleware.ts`. Ya está en el repositorio en `/proxy.ts` y se encarga de refrescar la sesión de Supabase.

### Comandos disponibles

```bash
npm install      # instalar dependencias
npm run dev      # desarrollo local en http://localhost:3000
npm run lint     # revisar estilo de código
npm run typecheck# revisar tipos de TypeScript
npm run test     # ejecutar pruebas (Vitest)
npm run build    # compilar para producción
```

### Base de datos (25 tablas, con RLS)

Las migraciones SQL están en `supabase/migrations/` y se aplican **en orden** en el editor SQL de Supabase (o con la CLI de Supabase):

1. `0001_extensions.sql` — extensiones `pgcrypto` y `citext`.
2. `0002_helpers_roles.sql` — funciones auxiliares de RLS (`current_user_role`, `is_coach`, `is_student`, `is_admin`, `coach_has_student`), más `set_updated_at` y `prevent_role_escalation`.
3. `0003_core_tables.sql` — las 25 tablas + índices + triggers de `updated_at` + trigger de protección de rol.
4. `0004_rls_policies.sql` — RLS activado y políticas en todas las tablas.
5. `0005_triggers.sql` — trigger `handle_new_user` sobre `auth.users` que crea un perfil base con `role` NULL y `status` `'pending'`.
6. `0006_storage.sql` — buckets + políticas de Storage.

Opcionalmente, después se puede ejecutar `supabase/seed.sql` (alimentos públicos `food_items` + ejercicios globales; los tips de ejemplo solo se cargan si ya existe una coach).

**Las 25 tablas:** `profiles`, `coach_profiles`, `student_profiles`, `coach_students`, `invitations`, `nutrition_plans`, `nutrition_plan_food_recommendations`, `food_items`, `food_logs`, `food_log_items`, `workout_plans`, `workout_plan_days`, `exercises`, `workout_plan_exercises`, `workout_logs`, `workout_log_sets`, `weight_entries`, `body_measurements`, `progress_photos`, `content_posts`, `content_assignments`, `coach_notes`, `student_checkins`, `alerts`, `auth_events`.

**Seguridad de la base de datos:**
- RLS activado en todas las tablas privadas.
- `profiles.id` referencia a `auth.users(id)`.
- Un trigger impide la escalada de rol: quien no use la clave de servicio no puede cambiar su propio rol.
- Las funciones auxiliares son `SECURITY DEFINER` con `search_path` fijado.

### Roles y alta de usuarios

- Roles: `'coach'`, `'student'`, `'admin'` (admin está preparado pero no construido del todo).
- **La primera coach se promueve a mano.** Después de registrarse en la app, en Supabase se ejecuta:

  ```sql
  update public.profiles
  set role = 'coach', status = 'active', onboarding_completed = true
  where email = 'TU_EMAIL';
  ```

- **Las alumnas son solo por invitación.** La coach crea una invitación: solo se guarda el `token_hash` (SHA-256), y el enlace en crudo se muestra una sola vez con la forma `/accept-invitation?token=...`.
- Un usuario que se registra solo, sin invitación, queda como alumna sin coach hasta que se le vincule.

### Storage (archivos)

Buckets ya creados:

| Bucket | Acceso | Uso |
|---|---|---|
| `food-photos` | privado | fotos de comidas |
| `progress-photos` | privado | fotos de progreso |
| `exercise-videos` | privado | videos de ejercicios |
| `avatars` | lectura pública | fotos de perfil |

- Convención de rutas: `<owner_uuid>/<filename>`.
- Cada alumna lee/escribe en su propia carpeta; su coach asignada puede leer.
- Tipos de imagen permitidos: `jpg`, `jpeg`, `png`, `webp`. Videos a futuro: `mp4`, `mov`.
- Tamaños máximos sugeridos: fotos ~5 MB, videos ~50 MB (se controla en el cliente o en la configuración del bucket).

### Autenticación

- Email + contraseña con confirmación por correo, restablecimiento y actualización de contraseña, y OAuth con Google, Facebook y Apple.
- Rutas implementadas: `/auth/callback` (intercambio del código OAuth, valida el parámetro `next`, redirige según rol, y ante errores va a `/auth/auth-code-error`), `/auth/confirm` (verificación del OTP de correo), `/auth/logout`, `/auth/auth-code-error`.
- El login redirige según rol: coach/admin → `/coach`; alumna → `/student/today`; perfil incompleto → `/onboarding`; usuario inactivo → bloqueado.

### Rutas implementadas

- **Públicas:** `/`, `/login`, `/register`, `/accept-invitation`, `/forgot-password`, `/reset-password`, `/update-password`, `/terms`, `/privacy`, `/disclaimer`
- **Auth:** `/auth/callback`, `/auth/auth-code-error`, `/auth/confirm`, `/auth/logout`
- **Onboarding:** `/onboarding`
- **Coach:** `/coach`, `/coach/students`, `/coach/students/invite`, `/coach/students/[studentId]` (+ `/nutrition`, `/workouts`, `/progress`), `/coach/nutrition`, `/coach/workouts`, `/coach/exercises` (+ `/new`, `/[id]`), `/coach/content` (+ `/new`, `/[id]`), `/coach/settings`
- **Alumna:** `/student` (→ today), `/student/today`, `/student/meals` (+ `/new`), `/student/workout`, `/student/progress`, `/student/content`, `/student/profile`
- **API:** `/api/health`, `/api/webhooks` (placeholder, responde 501)

### Lógica de dominio (TypeScript puro, 42 pruebas con Vitest)

- **Nutrición:** macros, totales diarios, progreso de macros, "Macro Rescue" basado en reglas, adherencia.
- **Entrenamientos:** volumen, finalización, adherencia semanal, 1RM.
- **Progreso:** cambio de peso, tendencia semanal, cambio de medidas.
- **Alertas:** sin registros de comida, proteína baja, entrenamientos perdidos, pico de peso, progreso positivo.

---

## Fase 2 — Recomendada a continuación

Estas funciones aprovechan la base ya construida y son las que más valor agregan antes de abrir a usuarias reales.

### 1. Correo real (SMTP)

Hoy el desarrollo usa los correos por defecto de Supabase. Para producción hay que configurar **SMTP propio** en los ajustes de Auth de Supabase:

- [ ] Configurar SMTP en Supabase Auth con un remitente, por ejemplo `no-reply@evefitmethod.com`.
- [ ] Agregar en el dominio los registros DNS **SPF**, **DKIM** y **DMARC** para que los correos no caigan en spam.
- [ ] Verificar los cuatro correos transaccionales: confirmación de email, restablecimiento de contraseña, invitación y bienvenida.

### 2. Correos de invitación

Hoy la invitación genera el enlace `/accept-invitation?token=...`, que se muestra una sola vez. El siguiente paso es **enviarlo automáticamente por correo** a la alumna en lugar de copiarlo a mano. Depende de tener el SMTP listo (punto anterior).

### 3. Constructor de planes de entrenamiento (día / ejercicio)

Las tablas `workout_plans`, `workout_plan_days`, `exercises` y `workout_plan_exercises` ya existen. Falta la **interfaz** para que la coach arme un plan: crear días, agregar ejercicios a cada día, y definir series/repeticiones por ejercicio.

### 4. Interfaz para subir fotos de comidas

El bucket `food-photos` (privado) y la convención de rutas `<owner_uuid>/<filename>` ya están listos. Falta la **interfaz de carga** en el portal de la alumna (probablemente en `/student/meals/new`), con validación de tipo de imagen (`jpg`, `jpeg`, `png`, `webp`) y límite sugerido de ~5 MB en el cliente.

### 5. Interfaz para asignar contenido

Las tablas `content_posts` y `content_assignments` ya existen. Falta la **interfaz** en el portal de la coach (en `/coach/content`) para asignar publicaciones a alumnas específicas.

### 6. Acciones de revisión de la coach

La lógica de **alertas** ya está construida y probada (sin registros de comida, proteína baja, entrenamientos perdidos, pico de peso, progreso positivo). Falta la **interfaz** para que la coach actúe sobre esas alertas: revisar a la alumna del día, dejar notas (`coach_notes`) y responder check-ins (`student_checkins`).

### 7. Rate limiting + CAPTCHA en autenticación

Para proteger el login y el registro contra abuso:

- [ ] Añadir **rate limiting** en las rutas de autenticación.
- [ ] Añadir **CAPTCHA** en login y registro.

---

## Fase 3 — Futuro

Funciones de mayor alcance, para cuando la plataforma ya tenga uso real. **Ninguna está implementada todavía.**

- **Pagos con Stripe.** Variables de entorno previstas (aún no implementadas): `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Existe el placeholder `/api/webhooks` (hoy responde 501) que podría usarse para los webhooks de Stripe.
- **Asistencia con IA.** Por ejemplo, sugerencias automáticas para planes o análisis de progreso.
- **Push / PWA.** Notificaciones y experiencia instalable desde el navegador.
- **App nativa.** Una app móvil dedicada (hoy la plataforma es web responsive).
- **Multi-coach.** Soportar varias coaches, cada una con sus propias alumnas (hoy el modelo es de una sola coach).

---

## Checklist antes de producción

Estos puntos hay que cerrarlos antes de abrir la plataforma a usuarias reales.

### Revisión legal

- [ ] Revisar y validar los textos legales: `/terms`, `/privacy` y `/disclaimer`.
- [ ] Confirmar que el aviso de salud aparezca y diga exactamente:

  > EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios importantes en alimentación o entrenamiento.

### SMTP propio

- [ ] Configurar SMTP en Supabase con remitente `no-reply@evefitmethod.com`.
- [ ] Configurar SPF, DKIM y DMARC en el dominio.
- [ ] Probar confirmación de email, restablecimiento, invitación y bienvenida.

### Checklist de seguridad

- [ ] RLS activado en todas las tablas privadas (ya está; verificar tras cualquier cambio de esquema).
- [ ] Validar toda entrada con **Zod**.
- [ ] Validar permisos en el servidor con los guards `requireAuth`, `requireCoach`, `requireStudent` y `assertCoachOwnsStudent`.
- [ ] Nunca poner claves de servicio o secretas en el cliente. Solo las variables `NEXT_PUBLIC_*` llegan al navegador. `SUPABASE_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY` son solo de servidor; la `SERVICE_ROLE` ignora RLS y se usa únicamente para aceptar invitaciones.
- [ ] No guardar datos sensibles en `localStorage`.
- [ ] Evitar redirecciones abiertas en `/auth/callback` (solo rutas relativas).
- [ ] Mantener la protección contra escalada de rol.
- [ ] Sanitizar el contenido que crea la coach.
- [ ] Revisar las **2 advertencias moderadas** de `npm audit` pendientes.
- [ ] Cerrar **rate limiting + CAPTCHA** en autenticación (ver Fase 2).

### Monitoreo (Sentry)

- [ ] Integrar Sentry para capturar errores en producción. Variables de entorno previstas (aún no implementadas): `SENTRY_DSN` (servidor) y `NEXT_PUBLIC_SENTRY_DSN` (cliente).

### Copias de seguridad

- [ ] Activar y verificar las copias de seguridad de la base de datos en Supabase.

---

## Apéndice: configuración de despliegue

Información de referencia para el despliegue. La dueña ya creó el repositorio de GitHub.

### Variables de entorno

Nunca subir secretos reales al repositorio. Solo las `NEXT_PUBLIC_*` llegan al navegador. Plantilla en `.env.example`:

```bash
NEXT_PUBLIC_SITE_URL=https://app.evefitmethod.com
NEXT_PUBLIC_MARKETING_URL=https://evefitmethod.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # (o el antiguo NEXT_PUBLIC_SUPABASE_ANON_KEY — la app acepta cualquiera)
SUPABASE_SECRET_KEY=          # solo servidor
SUPABASE_SERVICE_ROLE_KEY=    # solo servidor; ignora RLS; usado solo al aceptar invitaciones
```

Variables previstas a futuro (no implementadas): `RESEND_API_KEY`, `POSTMARK_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### Desplegar en Vercel

1. Importar el repositorio de GitHub en Vercel.
2. Framework: **Next.js**. Build: `npm run build`. Install: `npm install`.
3. Agregar las variables de entorno en los tres entornos (Production, Preview y Development).
4. Rama de producción: `main`.
5. Tras el despliegue, actualizar en Supabase el **Site URL** y las **Redirect URLs** al dominio real y probar el login.

### Dominios (planeados)

- `evefitmethod.com` — marketing / landing.
- `app.evefitmethod.com` — la app privada.
- `www.evefitmethod.com` — alias.

Por ahora una sola app de Next.js sirve a todos. El dominio se puede comprar en Vercel (pestaña Domains) o en un registrador externo; si es externo, se agrega el dominio en Vercel y se configuran los registros DNS que Vercel indique (A/ALIAS para el apex, CNAME `cname.vercel-dns.com` para `www` y `app`). Confirmar el SSL.

### Configuración de Auth en el panel de Supabase

- **Site URL:** `https://app.evefitmethod.com`
- **Redirect URLs (agregar todas):**
  - `http://localhost:3000/**`
  - `http://localhost:3000/auth/callback`
  - `https://app.evefitmethod.com/**`
  - `https://app.evefitmethod.com/auth/callback`
  - `https://evefitmethod.com/**`
  - `https://evefitmethod.com/auth/callback`
  - `https://www.evefitmethod.com/**`
  - `https://www.evefitmethod.com/auth/callback`
- **Providers a habilitar:** Email (con confirmaciones), Google, Facebook, Apple.

### Configuración de OAuth (manual, fuera de la app)

- **Google:** Google Cloud Console → OAuth consent screen → crear OAuth Client ID (Web) → como Authorized redirect URI poner el callback de Supabase que se muestra en Auth > Providers > Google (`https://<project-ref>.supabase.co/auth/v1/callback`) → copiar Client ID + Secret en Supabase.
- **Facebook:** Meta for Developers → crear app → agregar Facebook Login → en Valid OAuth Redirect URIs poner el callback de Supabase → permisos `public_profile` y `email` → copiar App ID + App Secret en Supabase.
- **Apple:** requiere cuenta de Apple Developer de pago → crear un Services ID → configurar el dominio y la return URL (el callback de Supabase) → crear una clave `.p8` de "Sign in with Apple" → configurarla en Supabase (Apple envía el nombre solo en el primer login).
