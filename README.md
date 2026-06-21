# EveFit Method

> Plataforma web responsive de coaching fitness y nutrición: una coach gestiona a sus alumnas. La alumna sabe qué hacer hoy; la coach sabe a quién revisar hoy.

---

## Índice

- [Qué es](#qué-es)
- [Stack tecnológico](#stack-tecnológico)
- [Prerrequisitos](#prerrequisitos)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Configurar Supabase](#configurar-supabase)
- [Migraciones SQL y seed](#migraciones-sql-y-seed)
- [Crear la primera coach](#crear-la-primera-coach)
- [Configurar el login (email + Google/Facebook/Apple)](#configurar-el-login-email--googlefacebookapple)
- [Configurar los correos de confirmación](#configurar-los-correos-de-confirmación)
- [Subir el proyecto a GitHub](#subir-el-proyecto-a-github)
- [Desplegar en Vercel](#desplegar-en-vercel)
- [Conectar el dominio](#conectar-el-dominio)
- [Variables de entorno](#variables-de-entorno)
- [Rutas principales](#rutas-principales)
- [Roles](#roles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Almacenamiento (Storage)](#almacenamiento-storage)
- [Documentación completa](#documentación-completa)
- [Seguridad](#seguridad)
- [Próximos pasos](#próximos-pasos)
- [Aviso de salud](#aviso-de-salud)

---

## Qué es

**EveFit Method** es una plataforma web *responsive* (no es app nativa, ni Expo/React Native) para coaching de fitness y nutrición. El modelo es de **una coach que gestiona a sus alumnas** (estudiantes mujeres).

La idea central:

- La **alumna** sabe **qué hacer hoy** (su comida, su entrenamiento, su seguimiento).
- La **coach** sabe **a quién revisar hoy** (alertas, adherencia, progreso).

Dominios planificados (una sola app Next.js los sirve todos por ahora):

| Dominio | Uso |
| --- | --- |
| `evefitmethod.com` | Landing / marketing |
| `app.evefitmethod.com` | Aplicación privada |
| `www.evefitmethod.com` | Alias |

El sistema de diseño es oscuro, **"Acero & Escarlata"**: escarlata `#FF3B47`, acero oscuro y blanco.

---

## Stack tecnológico

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript** (modo estricto)
- **Tailwind CSS v4**
- **@supabase/ssr** + **Supabase** (Auth, Postgres, Storage)
- **Zod v4** + **React Hook Form**
- **Vitest** (pruebas)
- Gestor de paquetes: **npm**

> **Nota:** Next.js 16 usa `proxy.ts` (no `middleware.ts`). Ya está implementado en este repositorio en `/proxy.ts` y se encarga de refrescar la sesión de Supabase.

---

## Prerrequisitos

- **Node.js 20+**
- **npm**
- Una cuenta de **Supabase** (para la base de datos, autenticación y almacenamiento)

---

## Instalación y ejecución local

```bash
npm install      # instalar dependencias
npm run dev      # arrancar en modo desarrollo
```

La app queda disponible en **http://localhost:3000**.

Otros comandos útiles:

```bash
npm run lint        # análisis de estilo y errores
npm run typecheck   # verificación de tipos TypeScript
npm run test        # ejecutar pruebas con Vitest
npm run build       # compilar para producción
```

---

## Configurar Supabase

1. Entra a [Supabase](https://supabase.com) y **crea un proyecto nuevo**.
2. Copia el archivo de ejemplo de variables de entorno:

   ```bash
   cp .env.example .env.local
   ```

3. En el panel de Supabase, ve a **Project Settings → API** y copia los valores hacia `.env.local`:
   - **URL del proyecto** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Clave publishable** (o la legacy anon key) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la app acepta también `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **Clave secreta** → `SUPABASE_SECRET_KEY` (solo servidor)
   - **Service role key** → `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; ignora RLS y se usa **únicamente** para aceptar invitaciones)

> **Importante:** nunca subas secretos reales al repositorio. Solo las variables con prefijo `NEXT_PUBLIC_*` llegan al navegador; las demás son únicamente de servidor.

Consulta la tabla completa en [Variables de entorno](#variables-de-entorno).

---

## Migraciones SQL y seed

Las migraciones están en `supabase/migrations/` y deben ejecutarse **en orden** en el **SQL editor** de Supabase (o con la **Supabase CLI**).

Ejecuta en este orden:

- [ ] `0001_extensions.sql` — extensiones `pgcrypto` y `citext`
- [ ] `0002_helpers_roles.sql` — funciones helper de RLS (`current_user_role`, `is_coach`, `is_student`, `is_admin`, `coach_has_student`), `set_updated_at` y `prevent_role_escalation`
- [ ] `0003_core_tables.sql` — las 25 tablas + índices + triggers `updated_at` + trigger de protección de roles
- [ ] `0004_rls_policies.sql` — activa RLS y define las políticas en todas las tablas
- [ ] `0005_triggers.sql` — trigger `handle_new_user` sobre `auth.users` que crea un perfil base con `role` NULL y `status` `'pending'`
- [ ] `0006_storage.sql` — buckets + políticas de almacenamiento

Después, de forma **opcional**:

- [ ] `supabase/seed.sql` — `food_items` públicos + ejercicios globales (los tips de ejemplo solo se cargan si ya existe una coach)

### Sobre la base de datos

Las **25 tablas** son:

`profiles`, `coach_profiles`, `student_profiles`, `coach_students`, `invitations`, `nutrition_plans`, `nutrition_plan_food_recommendations`, `food_items`, `food_logs`, `food_log_items`, `workout_plans`, `workout_plan_days`, `exercises`, `workout_plan_exercises`, `workout_logs`, `workout_log_sets`, `weight_entries`, `body_measurements`, `progress_photos`, `content_posts`, `content_assignments`, `coach_notes`, `student_checkins`, `alerts`, `auth_events`.

Notas de seguridad de la base de datos:

- **RLS** activado en cada tabla privada.
- `profiles.id` referencia a `auth.users(id)`.
- La **escalada de roles** está bloqueada por un trigger: quien no use la service role key no puede cambiar su propio rol.
- Las funciones helper son `SECURITY DEFINER` con `search_path` fijado.

---

## Crear la primera coach

Las **alumnas son solo por invitación**, pero la **primera coach se promueve manualmente**.

1. Regístrate normalmente en la app con tu correo.
2. En el **SQL editor** de Supabase, ejecuta (reemplaza tu correo):

   ```sql
   update public.profiles
   set role = 'coach',
       status = 'active',
       onboarding_completed = true
   where email = 'YOUR_EMAIL';
   ```

A partir de aquí, esa coach puede crear invitaciones para sus alumnas. Al crear una invitación solo se guarda un `token_hash` (SHA-256); el enlace en crudo se muestra **una sola vez** con la forma `/accept-invitation?token=...`.

> Un usuario que se auto-registra **sin invitación** queda como alumna **sin coach** hasta que sea vinculada.

---

## Configurar el login (email + Google/Facebook/Apple)

La autenticación usa Supabase: email + contraseña con confirmación de correo, recuperación y actualización de contraseña, y OAuth con **Google, Facebook y Apple**.

Configuración en el panel de Supabase (**Authentication**):

- **Site URL:** `https://app.evefitmethod.com`
- **Redirect URLs** (agrega todas):
  - `http://localhost:3000/**`
  - `http://localhost:3000/auth/callback`
  - `https://app.evefitmethod.com/**`
  - `https://app.evefitmethod.com/auth/callback`
  - `https://evefitmethod.com/**`
  - `https://evefitmethod.com/auth/callback`
  - `https://www.evefitmethod.com/**`
  - `https://www.evefitmethod.com/auth/callback`
- **Providers a habilitar:** Email (con confirmaciones), Google, Facebook, Apple.

Rutas de auth ya implementadas en la app:

- `/auth/callback` — intercambia el código OAuth, valida el parámetro `next`, redirige según el rol y, ante error, lleva a `/auth/auth-code-error`
- `/auth/confirm` — verificación del OTP de correo
- `/auth/logout`
- `/auth/auth-code-error`

Redirección por rol al iniciar sesión:

- coach / admin → `/coach`
- student → `/student/today`
- perfil incompleto → `/onboarding`
- usuario inactivo → bloqueado

El detalle de la configuración de cada proveedor OAuth (Google Cloud Console, Meta for Developers, Apple Developer) está en **[docs/AUTH_SETUP.md](docs/AUTH_SETUP.md)**.

---

## Configurar los correos de confirmación

- En **desarrollo** se usan los correos por defecto de Supabase.
- En **producción** debes configurar un **SMTP propio** en **Authentication → settings** de Supabase, con un remitente como `no-reply@evefitmethod.com`, más los registros DNS **SPF, DKIM y DMARC** en el dominio.

Correos transaccionales: confirmación de correo, recuperación de contraseña, invitación y bienvenida.

---

## Subir el proyecto a GitHub

El repositorio de GitHub ya fue creado por la propietaria. Los pasos detallados para subir el código están en **[docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md)**.

---

## Desplegar en Vercel

Resumen del despliegue (guía completa en **[docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)**):

1. En Vercel, **importa el repositorio de GitHub**.
2. Framework: **Next.js**.
3. Build command: `npm run build`.
4. Install command: `npm install`.
5. Agrega las **variables de entorno** (en Production + Preview + Development).
6. Rama de producción: `main`.
7. Tras el despliegue, **actualiza en Supabase** la *Site URL* y las *Redirect URLs* con el dominio real y **prueba el login**.

---

## Conectar el dominio

Resumen (guía completa en **[docs/DOMAIN_SETUP.md](docs/DOMAIN_SETUP.md)**):

- Compra el dominio en **Vercel** (pestaña *Domains*) **o** en un registrador externo.
- Si es externo: agrega el dominio en Vercel y configura los **registros DNS** que Vercel muestre:
  - **A / ALIAS** para el apex (`evefitmethod.com`)
  - **CNAME** `cname.vercel-dns.com` para `www` y `app`
- Verifica el **SSL**.

Recomendado: `app.evefitmethod.com` para la app y `evefitmethod.com` para landing/redirect.

---

## Variables de entorno

Definidas en `.env.example`. Nunca subas secretos reales; solo las `NEXT_PUBLIC_*` llegan al navegador.

| Variable | Ámbito | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Cliente | URL de la app, p. ej. `https://app.evefitmethod.com` |
| `NEXT_PUBLIC_MARKETING_URL` | Cliente | URL del sitio de marketing, p. ej. `https://evefitmethod.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente | Clave publishable de Supabase (o la legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`; la app acepta cualquiera) |
| `SUPABASE_SECRET_KEY` | Servidor | Clave secreta de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor | Service role; ignora RLS; usada solo para aceptar invitaciones |

### Variables futuras (NO implementadas)

`RESEND_API_KEY`, `POSTMARK_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

---

## Rutas principales

### Públicas

`/` · `/login` · `/register` · `/accept-invitation` · `/forgot-password` · `/reset-password` · `/update-password` · `/terms` · `/privacy` · `/disclaimer`

### Auth

`/auth/callback` · `/auth/auth-code-error` · `/auth/confirm` · `/auth/logout`

### Onboarding

`/onboarding`

### Coach

`/coach` · `/coach/students` · `/coach/students/invite` · `/coach/students/[studentId]` (+ `/nutrition` `/workouts` `/progress`) · `/coach/nutrition` · `/coach/workouts` · `/coach/exercises` (+ `/new` `/[id]`) · `/coach/content` (+ `/new` `/[id]`) · `/coach/settings`

### Student

`/student` (→ today) · `/student/today` · `/student/meals` (+ `/new`) · `/student/workout` · `/student/progress` · `/student/content` · `/student/profile`

### API

`/api/health` · `/api/webhooks` (placeholder, responde 501)

---

## Roles

| Rol | Descripción |
| --- | --- |
| `coach` | Gestiona a sus alumnas. La primera coach se promueve manualmente por SQL. |
| `student` | Alumna. Solo por invitación; sin invitación queda como alumna sin coach hasta ser vinculada. |
| `admin` | Preparado, pero aún no construido por completo. |

---

## Estructura del proyecto

- `/proxy.ts` — refresca la sesión de Supabase (reemplaza al antiguo `middleware.ts` de Next.js 16)
- `supabase/migrations/` — migraciones SQL (`0001`–`0006`), aplicadas en orden
- `supabase/seed.sql` — datos iniciales opcionales
- `.env.example` — plantilla de variables de entorno
- `docs/` — documentación de configuración y despliegue

### Lógica de dominio

Lógica pura en TypeScript, probada con Vitest (**42 tests**):

- **Nutrición:** macros, totales diarios, progreso de macros, *Macro Rescue* basado en reglas, adherencia.
- **Entrenamientos:** volumen, completitud, adherencia semanal, 1RM.
- **Progreso:** cambio de peso, tendencia semanal, cambio de medidas.
- **Alertas:** sin registros de comida, proteína baja, entrenamientos perdidos, pico de peso, progreso positivo.

---

## Almacenamiento (Storage)

| Bucket | Acceso |
| --- | --- |
| `food-photos` | Privado |
| `progress-photos` | Privado |
| `exercise-videos` | Privado |
| `avatars` | Lectura pública |

- Convención de ruta: `<owner_uuid>/<filename>`.
- Las alumnas leen/escriben su propia carpeta; la coach asignada puede leer.
- Tipos de imagen permitidos: `jpg`, `jpeg`, `png`, `webp`. Vídeos (futuro): `mp4`, `mov`.
- Tamaños máximos sugeridos: fotos ~5 MB, vídeos ~50 MB (se aplican en el cliente y/o desde la configuración del bucket).

---

## Documentación completa

- **[docs/AUTH_SETUP.md](docs/AUTH_SETUP.md)** — configuración de login y proveedores OAuth (Google, Facebook, Apple)
- **[docs/GITHUB_SETUP.md](docs/GITHUB_SETUP.md)** — subir el proyecto a GitHub
- **[docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)** — desplegar en Vercel
- **[docs/DOMAIN_SETUP.md](docs/DOMAIN_SETUP.md)** — conectar el dominio

---

## Seguridad

- **RLS** activado en todas las tablas privadas.
- Validación de entradas con **Zod**.
- Validación de permisos **en el servidor** con guards: `requireAuth`, `requireCoach`, `requireStudent`, `assertCoachOwnsStudent`.
- Nunca pongas las claves secret/service en el cliente.
- No guardes datos sensibles en `localStorage`.
- Evita *open redirects* en `/auth/callback` (solo rutas relativas).
- Prevención de escalada de roles (vía trigger).
- Saneamiento del contenido creado por la coach.

### Pendiente antes de producción

- [ ] Rate limiting + CAPTCHA en autenticación
- [ ] SMTP propio
- [ ] Revisar los textos legales
- [ ] Revisar 2 advisories `npm audit` de severidad moderada

---

## Próximos pasos

1. [ ] Crear el proyecto en Supabase y copiar las claves a `.env.local`.
2. [ ] Ejecutar las migraciones `0001`–`0006` en orden y, opcionalmente, cargar `seed.sql`.
3. [ ] Registrarte y promover tu cuenta a coach con el SQL de la primera coach.
4. [ ] Configurar el login (email + Google/Facebook/Apple) siguiendo `docs/AUTH_SETUP.md`.
5. [ ] Subir el proyecto a GitHub (`docs/GITHUB_SETUP.md`).
6. [ ] Desplegar en Vercel (`docs/VERCEL_DEPLOYMENT.md`).
7. [ ] Conectar el dominio (`docs/DOMAIN_SETUP.md`).
8. [ ] Actualizar Site URL + Redirect URLs en Supabase con el dominio real y probar el login.
9. [ ] Configurar SMTP propio y los registros DNS (SPF, DKIM, DMARC) para producción.

---

## Aviso de salud

> EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios importantes en alimentación o entrenamiento.
