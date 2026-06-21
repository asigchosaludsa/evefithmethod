# CLAUDE.md — Memoria del Proyecto EveFit Method

> Este archivo es la memoria del proyecto para futuras sesiones de IA y de desarrollo.
> Léelo completo antes de tocar el código. Usa solo los hechos aquí descritos; no inventes
> nombres de archivos, variables de entorno, rutas ni comandos que no figuren en este documento.

---

## Resumen del proyecto (memoria en viñetas)

- **Proyecto:** EveFit Method.
- **Dominio principal:** `evefitmethod.com`.
- **Portal de la app:** `app.evefitmethod.com`.
- **Tipo de plataforma:** web responsive (con visión futura de app móvil). **NO** es app nativa.
- **Stack:** Next.js 16 / TypeScript / Tailwind CSS v4 / Supabase / GitHub / Vercel.
- **NO** se usa Firebase, **NO** Expo, **NO** React Native.
- **Diseño B3 "Acero & Escarlata"** (oscuro, escarlata): **YA aplicado**.
- **Prioridades:** seguridad, arquitectura y funcionalidad.
- **Autenticación y datos:** Supabase Auth + RLS + Storage.
- **Despliegue:** Vercel. **Código:** en GitHub.
- **NO** se construyen pagos / IA / chat **hasta aprobación**.
- Mantener la documentación y el código **modular**.
- **No borrar archivos sin inspeccionarlos** primero.
- **Capa de dominio** en `/domain`, con tests en **Vitest**.
- **Guardas de autenticación** en `/lib/auth`.
- **Migraciones** en `/supabase/migrations`, aplicadas **en orden**.

---

## Producto

EveFit Method es una **plataforma web responsive** de coaching de fitness y nutrición: una sola
coach gestiona a sus alumnas. La idea central:

- **La alumna sabe qué tiene que hacer hoy.**
- **La coach sabe a quién tiene que revisar hoy.**

No es una app nativa, no usa Expo / React Native, no usa Firebase. La visión futura contempla una
app móvil, pero hoy es una única aplicación web.

---

## Dominios (planificados)

| Dominio | Uso |
|---|---|
| `evefitmethod.com` | Marketing / landing |
| `app.evefitmethod.com` | Aplicación privada |
| `www.evefitmethod.com` | Alias |

Por ahora **una sola app Next.js** sirve todos los dominios.

---

## Stack técnico

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript** (modo `strict`)
- **Tailwind CSS v4**
- **@supabase/ssr** + **Supabase** (Auth, Postgres, Storage)
- **Zod v4**
- **React Hook Form**
- **Vitest**
- **Gestor de paquetes:** npm
- **Sistema de diseño oscuro "Acero & Escarlata":** escarlata `#FF3B47`, acero oscuro, blanco.

> **Nota Next.js 16:** se usa `proxy.ts` (no `middleware.ts`). Ya está hecho en este repo, en
> `/proxy.ts`; se encarga de refrescar la sesión de Supabase.

---

## Comandos

```bash
npm install      # Instalar dependencias
npm run dev      # Servidor de desarrollo (http://localhost:3000)
npm run lint     # Linter
npm run typecheck # Comprobación de tipos de TypeScript
npm run test     # Tests con Vitest
npm run build    # Build de producción
```

URL local: `http://localhost:3000`.

---

## Variables de entorno

Están documentadas en `.env.example`. **Nunca** subas secretos reales al repositorio. Solo las
variables con prefijo `NEXT_PUBLIC_*` llegan al navegador.

```bash
NEXT_PUBLIC_SITE_URL=https://app.evefitmethod.com
NEXT_PUBLIC_MARKETING_URL=https://evefitmethod.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=    # (o la antigua NEXT_PUBLIC_SUPABASE_ANON_KEY — la app acepta cualquiera de las dos)
SUPABASE_SECRET_KEY=                     # solo servidor
SUPABASE_SERVICE_ROLE_KEY=               # solo servidor; salta RLS; se usa únicamente para aceptar invitaciones
```

**Variables futuras (NO implementadas todavía):** `RESEND_API_KEY`, `POSTMARK_API_KEY`,
`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

> Las claves de servicio / secretas **nunca** deben aparecer en el cliente.

---

## Base de datos

Las migraciones SQL están en `supabase/migrations/` y se aplican **EN ORDEN** en el editor SQL de
Supabase (o con la CLI de Supabase):

| Orden | Archivo | Contenido |
|---|---|---|
| 1 | `0001_extensions.sql` | Extensiones: `pgcrypto`, `citext` |
| 2 | `0002_helpers_roles.sql` | Funciones helper de RLS: `current_user_role`, `is_coach`, `is_student`, `is_admin`, `coach_has_student`; `set_updated_at`; `prevent_role_escalation` |
| 3 | `0003_core_tables.sql` | Las 25 tablas + índices + triggers `updated_at` + trigger de guarda de rol |
| 4 | `0004_rls_policies.sql` | RLS habilitado + políticas en todas las tablas |
| 5 | `0005_triggers.sql` | Trigger `handle_new_user` en `auth.users` que crea un perfil base con rol `NULL` y estado `'pending'` |
| 6 | `0006_storage.sql` | Buckets + políticas de Storage |

Luego, opcionalmente, `supabase/seed.sql` (food_items públicos + ejercicios globales; tips de
ejemplo solo si existe una coach).

### Las 25 tablas

`profiles`, `coach_profiles`, `student_profiles`, `coach_students`, `invitations`,
`nutrition_plans`, `nutrition_plan_food_recommendations`, `food_items`, `food_logs`,
`food_log_items`, `workout_plans`, `workout_plan_days`, `exercises`, `workout_plan_exercises`,
`workout_logs`, `workout_log_sets`, `weight_entries`, `body_measurements`, `progress_photos`,
`content_posts`, `content_assignments`, `coach_notes`, `student_checkins`, `alerts`, `auth_events`.

### RLS y seguridad de datos

- RLS habilitado en **todas** las tablas privadas.
- `profiles.id` referencia a `auth.users(id)`.
- La **escalada de rol** se previene con un trigger: los llamadores que no usan la service role no
  pueden cambiar su propio rol.
- Las funciones helper son `SECURITY DEFINER` con `search_path` fijado (pinned).

---

## Roles y altas

Roles: `'coach'`, `'student'`, `'admin'` (admin está preparado, no completamente construido).

### Primera coach (promoción manual)

Tras registrarse, en Supabase se ejecuta:

```sql
update public.profiles
set role = 'coach', status = 'active', onboarding_completed = true
where email = 'YOUR_EMAIL';
```

### Alumnas (solo por invitación)

- La coach crea una invitación. Solo se guarda un `token_hash` SHA-256; el enlace en crudo se
  muestra **una sola vez**: `/accept-invitation?token=...`.
- Un usuario que se registra por su cuenta sin invitación queda como alumna **sin coach** hasta que
  se la vincule.

---

## Storage (buckets)

| Bucket | Acceso |
|---|---|
| `food-photos` | privado |
| `progress-photos` | privado |
| `exercise-videos` | privado |
| `avatars` | lectura pública |

- **Convención de ruta:** `<owner_uuid>/<filename>`.
- Las alumnas leen/escriben en su propia carpeta; la coach asignada puede leer.
- **Tipos de imagen permitidos:** jpg, jpeg, png, webp.
- **Vídeos (futuro):** mp4, mov.
- **Tamaños máximos sugeridos:** fotos ~5MB, vídeos ~50MB (forzar en el cliente / vía ajustes del bucket).

---

## Autenticación (Supabase)

- Email + contraseña con confirmación por correo.
- Restablecer y actualizar contraseña.
- OAuth con Google, Facebook y Apple.

### Rutas de auth implementadas

- `/auth/callback` — intercambio de código OAuth; valida `next`; redirige por rol; en error va a `/auth/auth-code-error`.
- `/auth/confirm` — verificación de OTP de email.
- `/auth/logout`
- `/auth/auth-code-error`

### Redirección de login por rol

- coach / admin → `/coach`
- student → `/student/today`
- perfil incompleto → `/onboarding`
- inactivo → bloqueado

### Configuración de Auth en el panel de Supabase

- **Site URL:** `https://app.evefitmethod.com`
- **Redirect URLs (añadir todas):**
  - `http://localhost:3000/**`
  - `http://localhost:3000/auth/callback`
  - `https://app.evefitmethod.com/**`
  - `https://app.evefitmethod.com/auth/callback`
  - `https://evefitmethod.com/**`
  - `https://evefitmethod.com/auth/callback`
  - `https://www.evefitmethod.com/**`
  - `https://www.evefitmethod.com/auth/callback`
- **Providers a habilitar:** Email (con confirmaciones), Google, Facebook, Apple.

### Configuración de proveedores OAuth (manual, fuera de la app)

- **Google:** Google Cloud Console → OAuth consent screen → Create OAuth Client ID (Web) →
  Authorized redirect URI = el callback de Supabase mostrado en Supabase Auth > Providers > Google
  (`https://<project-ref>.supabase.co/auth/v1/callback`) → copia Client ID + Secret en Supabase.
- **Facebook:** Meta for Developers → crear app → añadir Facebook Login → Valid OAuth Redirect URIs
  = el callback de Supabase → permisos `public_profile`, `email` → copia App ID + App Secret en Supabase.
- **Apple:** requiere cuenta de pago de Apple Developer → crear un Services ID → configurar dominio
  + return URL (el callback de Supabase) → crear una clave .p8 "Sign in with Apple" → configurar en
  Supabase (ojo: Apple envía el nombre solo en el primer login).

### Email

- En desarrollo se usan los correos por defecto de Supabase.
- En producción se necesita SMTP personalizado en los ajustes de Auth de Supabase, remitente p. ej.
  `no-reply@evefitmethod.com`, más registros DNS **SPF, DKIM, DMARC** en el dominio.
- Correos transaccionales: confirmar email, restablecer contraseña, invitación, bienvenida.

---

## Rutas

### Públicas
`/` , `/login` , `/register` , `/accept-invitation` , `/forgot-password` , `/reset-password` ,
`/update-password` , `/terms` , `/privacy` , `/disclaimer`

### Auth
`/auth/callback` , `/auth/auth-code-error` , `/auth/confirm` , `/auth/logout`

### Onboarding
`/onboarding`

### Coach
`/coach` , `/coach/students` , `/coach/students/invite` , `/coach/students/[studentId]`
(+ `/nutrition` `/workouts` `/progress`) , `/coach/nutrition` , `/coach/workouts` ,
`/coach/exercises` (+ `/new` `/[id]`) , `/coach/content` (+ `/new` `/[id]`) , `/coach/settings`

### Student
`/student` (→ today) , `/student/today` , `/student/meals` (+ `/new`) , `/student/workout` ,
`/student/progress` , `/student/content` , `/student/profile`

### API
`/api/health` , `/api/webhooks` (placeholder, 501)

---

## Lógica de dominio

Código TypeScript puro, en `/domain`, probado con **Vitest** (42 tests):

- **nutrition:** macros, totales diarios, progreso de macros, "Macro Rescue" basado en reglas, adherencia.
- **workouts:** volumen, completitud, adherencia semanal, 1RM.
- **progress:** cambio de peso, tendencia semanal, cambio de medidas.
- **alerts:** sin registros de comida, proteína baja, entrenamientos perdidos, pico de peso, progreso positivo.

---

## Dónde vive cada cosa

- **Capa de dominio (TS puro + tests):** `/domain`
- **Guardas de autenticación:** `/lib/auth` (`requireAuth`, `requireCoach`, `requireStudent`, `assertCoachOwnsStudent`)
- **Refresco de sesión / proxy de Next.js 16:** `/proxy.ts`
- **Migraciones SQL (en orden):** `/supabase/migrations`
- **Seed opcional:** `/supabase/seed.sql`
- **Plantilla de variables de entorno:** `.env.example`

---

## Despliegue

El repositorio de GitHub ya está creado por la dueña del proyecto.

### Vercel

1. Importar el repositorio de GitHub.
2. Framework: Next.js.
3. Build command: `npm run build`.
4. Install command: `npm install`.
5. Añadir las variables de entorno (Production + Preview + Development).
6. Production branch: `main`.

Después del despliegue: actualizar Site URL + Redirect URLs en Supabase al dominio real y probar el login.

### Dominio

- Comprar en Vercel (pestaña Domains) **o** en un registrador externo.
- Si es externo: añadir el dominio en Vercel y configurar los registros DNS que Vercel indique
  (A/ALIAS para el apex; CNAME `cname.vercel-dns.com` para `www` y `app`).
- Confirmar SSL.
- Recomendado: `app.evefitmethod.com` para la app, `evefitmethod.com` para landing / redirección.

---

## Seguridad

- RLS en todas partes.
- Validar la entrada con Zod.
- Validar permisos en el servidor (guardas `requireAuth` / `requireCoach` / `requireStudent` / `assertCoachOwnsStudent`).
- Nunca poner claves de servicio / secretas en el cliente.
- Nada de datos sensibles en `localStorage`.
- Evitar redirecciones abiertas en `/auth/callback` (solo rutas relativas).
- Prevenir la escalada de rol.
- Sanitizar el contenido de la coach.

### Pendientes antes de producción

- [ ] Rate limiting + CAPTCHA en auth.
- [ ] SMTP personalizado.
- [ ] Revisar los textos legales.
- [ ] Revisar 2 advisories moderados de `npm audit`.

---

## Reglas de trabajo (recordatorio para futuras sesiones)

- Priorizar **seguridad, arquitectura y funcionalidad**.
- **NO** construir pagos / IA / chat **hasta aprobación**.
- Mantener documentación y código **modulares**.
- **No borrar archivos sin inspeccionarlos** primero.
- Aplicar migraciones **en orden**.
- El diseño "Acero & Escarlata" ya está aplicado: respétalo.

---

## Aviso de salud (texto exacto)

> EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo
> médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de
> iniciar cambios importantes en alimentación o entrenamiento.
