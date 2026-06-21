# Configuración de Autenticación — EveFit Method

Esta guía explica, paso a paso, cómo configurar y poner en marcha el sistema de autenticación de **EveFit Method**. Está pensada para la dueña del proyecto, que seguirá estos pasos para desplegar. No necesitas ser experta: solo sigue el orden y copia los valores exactamente como se indican.

EveFit Method es una plataforma web responsive (no es app nativa) de coaching fitness y nutricional, donde una sola coach gestiona a sus alumnas. La autenticación se apoya en **Supabase Auth** (email + contraseña, y OAuth con Google, Facebook y Apple) sobre una app de **Next.js 16** con App Router.

---

## Índice

1. [Conceptos previos](#conceptos-previos)
2. [Variables de entorno necesarias](#variables-de-entorno-necesarias)
3. [Configuración del Dashboard de Supabase](#configuración-del-dashboard-de-supabase)
4. [Email + contraseña con confirmación](#email--contraseña-con-confirmación)
5. [Recuperar y actualizar contraseña](#recuperar-y-actualizar-contraseña)
6. [OAuth con Google — paso a paso](#oauth-con-google--paso-a-paso)
7. [OAuth con Facebook — paso a paso](#oauth-con-facebook--paso-a-paso)
8. [OAuth con Apple — paso a paso](#oauth-con-apple--paso-a-paso)
9. [El flujo /auth/callback](#el-flujo-authcallback)
10. [Redirección por rol](#redirección-por-rol)
11. [Flujo de invitaciones (coach → alumna)](#flujo-de-invitaciones-coach--alumna)
12. [Promover a la primera coach](#promover-a-la-primera-coach)
13. [Email transaccional en producción](#email-transaccional-en-producción)
14. [Errores comunes y soluciones](#errores-comunes-y-soluciones)
15. [Checklist final de despliegue](#checklist-final-de-despliegue)

---

## Conceptos previos

- **Dominios planificados:**
  - `evefitmethod.com` — landing / marketing.
  - `app.evefitmethod.com` — la app privada.
  - `www.evefitmethod.com` — alias.
  - Por ahora una sola app de Next.js sirve todo.
- **Roles:** `coach`, `student` (alumna) y `admin` (preparado, no terminado).
- **Refresco de sesión:** Next.js 16 usa `proxy.ts` (no `middleware.ts`). En este repositorio ya existe en `/proxy.ts` y se encarga de refrescar la sesión de Supabase. No tienes que tocarlo.
- **Inicio de sesión por rol:** tras autenticarse, la persona es redirigida según su rol (ver [Redirección por rol](#redirección-por-rol)).

---

## Variables de entorno necesarias

Estas variables viven en tu archivo de entorno. Hay un `.env.example` de referencia. **Nunca subas secretos reales al repositorio.** Solo las variables que empiezan con `NEXT_PUBLIC_` llegan al navegador; el resto son solo de servidor.

```bash
# Públicas (llegan al navegador)
NEXT_PUBLIC_SITE_URL=https://app.evefitmethod.com
NEXT_PUBLIC_MARKETING_URL=https://evefitmethod.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# (alternativa heredada: NEXT_PUBLIC_SUPABASE_ANON_KEY — la app acepta cualquiera de las dos)

# Solo servidor (NUNCA en el cliente)
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Notas importantes:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` es la clave pública de Supabase. Si tu proyecto todavía usa la nomenclatura antigua, puedes usar `NEXT_PUBLIC_SUPABASE_ANON_KEY`: **la app acepta cualquiera de las dos**.
- `SUPABASE_SECRET_KEY` es de servidor.
- `SUPABASE_SERVICE_ROLE_KEY` **bypassa RLS** (las reglas de seguridad de la base de datos). Se usa **únicamente** para la aceptación de invitaciones. No la pongas jamás en el navegador.

> Variables planificadas pero **aún no implementadas** (no las necesitas todavía): `RESEND_API_KEY`, `POSTMARK_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

En Vercel, agrega estas variables en los tres entornos: **Production**, **Preview** y **Development**.

---

## Configuración del Dashboard de Supabase

En el panel de Supabase, ve a **Authentication** y configura lo siguiente.

### Site URL

```
https://app.evefitmethod.com
```

### Redirect URLs (agrégalas TODAS)

```
http://localhost:3000/**
http://localhost:3000/auth/callback
https://app.evefitmethod.com/**
https://app.evefitmethod.com/auth/callback
https://evefitmethod.com/**
https://evefitmethod.com/auth/callback
https://www.evefitmethod.com/**
https://www.evefitmethod.com/auth/callback
```

### Providers (proveedores) a habilitar

- [ ] **Email** (con confirmaciones activadas)
- [ ] **Google**
- [ ] **Facebook**
- [ ] **Apple**

> Para desarrollo local puedes trabajar en `http://localhost:3000`. Las URLs de localhost ya están incluidas arriba.

---

## Email + contraseña con confirmación

Es el método base. La persona se registra con su email y contraseña, y debe **confirmar su correo** antes de poder usar la cuenta.

### Cómo funciona

1. La persona se registra en `/register`.
2. Supabase envía un email de confirmación.
3. Al hacer clic en el enlace del email, se verifica el código OTP en la ruta `/auth/confirm`.
4. Una vez confirmada, puede iniciar sesión en `/login`.
5. Tras iniciar sesión, se la redirige según su rol (ver [Redirección por rol](#redirección-por-rol)).

### Qué configurar

- En Supabase, habilita el proveedor **Email** con **confirmations** activadas.
- En desarrollo, Supabase usa sus emails por defecto (suficiente para probar).
- Para producción, configura SMTP propio (ver [Email transaccional en producción](#email-transaccional-en-producción)).

### Detalle técnico

Cuando un usuario nuevo se crea en `auth.users`, un trigger de base de datos (`handle_new_user`, definido en `0005_triggers.sql`) crea automáticamente un perfil base en la tabla `profiles` con:

- `role` = `NULL`
- `status` = `'pending'`

Esto significa que un usuario recién registrado todavía **no tiene rol asignado** hasta que se le vincule (por invitación) o se le promueva manualmente.

---

## Recuperar y actualizar contraseña

El sistema soporta tanto restablecer una contraseña olvidada como actualizar la contraseña.

### Rutas implicadas

- `/forgot-password` — la persona introduce su email para pedir el restablecimiento.
- `/reset-password` — pantalla del flujo de restablecimiento.
- `/update-password` — para establecer la nueva contraseña.

### Flujo de "olvidé mi contraseña"

1. La persona va a `/forgot-password` e introduce su email.
2. Supabase envía un email con un enlace seguro.
3. Al hacer clic, la persona llega al flujo de restablecimiento y define una nueva contraseña en `/update-password`.

Para que los enlaces de los emails funcionen correctamente, las **Redirect URLs** deben estar registradas en Supabase (ver sección de configuración). Si faltan, el enlace fallará.

---

## OAuth con Google — paso a paso

Toda la configuración de proveedor OAuth se hace **fuera de la app**, en la consola del proveedor y en Supabase.

1. Entra a **Google Cloud Console**.
2. Configura la **OAuth consent screen** (pantalla de consentimiento).
3. Crea un **OAuth Client ID** de tipo **Web**.
4. En **Authorized redirect URI**, pega la URL de callback que te muestra Supabase en **Auth > Providers > Google**. Tiene este formato:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
5. Copia el **Client ID** y el **Client Secret** que genera Google.
6. Pégalos en Supabase, en **Auth > Providers > Google**, y guarda.

Checklist Google:

- [ ] OAuth consent screen configurada
- [ ] OAuth Client ID (Web) creado
- [ ] Redirect URI de Supabase autorizado en Google
- [ ] Client ID + Secret copiados en Supabase
- [ ] Proveedor Google habilitado en Supabase

---

## OAuth con Facebook — paso a paso

1. Entra a **Meta for Developers**.
2. Crea una **app**.
3. Añade el producto **Facebook Login**.
4. En **Valid OAuth Redirect URIs**, pega la URL de callback de Supabase (la misma que muestra Supabase en **Auth > Providers > Facebook**, con formato `https://<project-ref>.supabase.co/auth/v1/callback`).
5. Configura los permisos: **`public_profile`** y **`email`**.
6. Copia el **App ID** y el **App Secret**.
7. Pégalos en Supabase, en **Auth > Providers > Facebook**, y guarda.

Checklist Facebook:

- [ ] App creada en Meta for Developers
- [ ] Facebook Login añadido
- [ ] Redirect URI de Supabase en "Valid OAuth Redirect URIs"
- [ ] Permisos `public_profile` y `email`
- [ ] App ID + App Secret copiados en Supabase
- [ ] Proveedor Facebook habilitado en Supabase

---

## OAuth con Apple — paso a paso

> **Importante:** Apple requiere una **cuenta de Apple Developer de pago**. Sin ella no podrás completar este flujo.

1. Crea un **Services ID** en tu cuenta de Apple Developer.
2. Configura el **dominio** y la **return URL** (que es la URL de callback de Supabase).
3. Crea una clave **.p8** de **Sign in with Apple**.
4. Configura esa clave en Supabase, en **Auth > Providers > Apple**.

> **Nota clave:** Apple envía el **nombre del usuario solo en el primer inicio de sesión**. En inicios posteriores no lo vuelve a enviar. Si necesitas el nombre, captúralo y guárdalo la primera vez.

Checklist Apple:

- [ ] Cuenta de Apple Developer de pago activa
- [ ] Services ID creado
- [ ] Dominio + return URL (callback de Supabase) configurados
- [ ] Clave .p8 de Sign in with Apple creada
- [ ] Clave configurada en Supabase
- [ ] Nombre capturado en el primer login (Apple no lo reenvía)
- [ ] Proveedor Apple habilitado en Supabase

---

## El flujo /auth/callback

`/auth/callback` es la ruta a la que vuelven los inicios de sesión por OAuth (Google, Facebook, Apple). Su trabajo es:

1. **Intercambiar el código (code exchange)** de OAuth por una sesión válida.
2. **Validar el parámetro `next`** (el destino al que se quiere ir después). Por seguridad, solo se permiten **rutas relativas** — esto evita *open redirects* (redirecciones a sitios externos maliciosos).
3. **Redirigir según el rol** de la persona (ver siguiente sección).
4. Si algo falla, redirige a **`/auth/auth-code-error`**.

Otras rutas de auth implementadas:

- `/auth/confirm` — verifica el OTP de email (confirmación de correo).
- `/auth/logout` — cierra sesión.
- `/auth/auth-code-error` — página de error del flujo de código.

> Para que `/auth/callback` funcione, su URL debe estar entre las **Redirect URLs** registradas en Supabase, tanto en localhost como en cada dominio de producción.

---

## Redirección por rol

Tras un inicio de sesión correcto, la app decide a dónde llevar a cada persona:

| Situación | Destino |
|-----------|---------|
| Rol `coach` o `admin` | `/coach` |
| Rol `student` (alumna) | `/student/today` |
| Perfil incompleto | `/onboarding` |
| Cuenta inactiva | **Bloqueada** (no entra) |

Recuerda que un usuario recién creado tiene `role = NULL` y `status = 'pending'`, por lo que normalmente pasará primero por `/onboarding` o quedará a la espera de vinculación.

---

## Flujo de invitaciones (coach → alumna)

Las alumnas son **solo por invitación**. La coach genera un enlace de invitación y la alumna lo acepta.

### Cómo funciona

1. **La coach crea la invitación** desde la app (por ejemplo en `/coach/students/invite`).
2. En la base de datos **solo se guarda un `token_hash` (SHA-256)** de la invitación, **nunca el token en crudo**.
3. El **enlace en crudo se muestra una sola vez** a la coach, con este formato:
   ```
   /accept-invitation?token=...
   ```
   La coach debe copiarlo y enviárselo a la alumna en ese momento (no se podrá volver a ver).
4. **La alumna abre el enlace** en `/accept-invitation`, acepta y queda vinculada a su coach.

### Detalle técnico

- La aceptación de la invitación es el **único** lugar donde se usa `SUPABASE_SERVICE_ROLE_KEY` (que bypassa RLS), y siempre del lado del servidor.
- Un usuario que se registre **por su cuenta sin invitación** se convierte en una alumna **sin coach** hasta que se le vincule.

Checklist de invitación:

- [ ] La coach genera el enlace en la app
- [ ] La coach copia el enlace en crudo (se muestra una sola vez)
- [ ] La coach se lo envía a la alumna
- [ ] La alumna abre `/accept-invitation?token=...` y acepta
- [ ] La alumna queda vinculada a la coach

---

## Promover a la primera coach

La **primera coach se promueve manualmente** en la base de datos. Tras registrarte normalmente con tu email, ejecuta esta consulta en el **SQL editor de Supabase** (reemplaza el email por el tuyo):

```sql
update public.profiles
set role = 'coach',
    status = 'active',
    onboarding_completed = true
where email = 'YOUR_EMAIL';
```

> El rol `admin` está preparado en el sistema pero aún no está completamente construido.

### Recordatorio sobre RLS y roles

- El RLS está activado en todas las tablas privadas.
- Un trigger **impide la escalada de roles**: una persona que no use la service role key **no puede cambiar su propio rol**. Por eso la promoción de la coach se hace directamente en el SQL editor de Supabase.

---

## Email transaccional en producción

En desarrollo, Supabase usa sus emails por defecto. **En producción debes configurar SMTP propio.**

Pasos:

1. En Supabase, ve a **Authentication settings** y configura un **SMTP personalizado**.
2. Define un remitente, por ejemplo: `no-reply@evefitmethod.com`.
3. Configura los **registros DNS** del dominio para asegurar la entregabilidad:
   - **SPF**
   - **DKIM**
   - **DMARC**

Los **emails transaccionales** del sistema son:

- Confirmación de email (confirm email)
- Restablecimiento de contraseña (reset password)
- Invitación (invitation)
- Bienvenida (welcome)

Checklist de email en producción:

- [ ] SMTP personalizado configurado en Supabase
- [ ] Remitente definido (p. ej. `no-reply@evefitmethod.com`)
- [ ] Registro SPF en el DNS
- [ ] Registro DKIM en el DNS
- [ ] Registro DMARC en el DNS

---

## Errores comunes y soluciones

### 1. Error de redirección (redirect mismatch)

**Síntoma:** después de iniciar sesión con OAuth o de hacer clic en un enlace de email, aparece un error de redirección, o la app te lleva a `/auth/auth-code-error`.

**Causa más común:** la URL no está registrada en las **Redirect URLs** de Supabase.

**Solución:**

- Verifica que **todas** las Redirect URLs estén agregadas en Supabase (ver la lista exacta en [Configuración del Dashboard de Supabase](#configuración-del-dashboard-de-supabase)), tanto las de `localhost` como las de los dominios de producción.
- Confirma que la **Site URL** sea exactamente `https://app.evefitmethod.com`.
- Asegúrate de incluir tanto las versiones con `/**` como las específicas `/auth/callback`.
- Recuerda que `/auth/callback` solo acepta **rutas relativas** en el parámetro `next` (para evitar open redirects). Un destino externo será rechazado.

### 2. Proveedor OAuth mal configurado (provider misconfig)

**Síntoma:** al elegir Google, Facebook o Apple, el inicio de sesión falla, da error de cliente OAuth o no vuelve a la app.

**Causa más común:** la **redirect URI del proveedor no coincide** con la callback de Supabase, o faltan Client ID / Secret.

**Solución:**

- En el proveedor (Google / Facebook / Apple), confirma que el **redirect URI autorizado** sea exactamente la callback de Supabase:
  ```
  https://<project-ref>.supabase.co/auth/v1/callback
  ```
- Verifica que el **Client ID / App ID** y el **Secret / App Secret** estén correctamente copiados en Supabase.
- En **Facebook**, confirma los permisos `public_profile` y `email`.
- En **Apple**, confirma que tienes la **cuenta de pago**, el **Services ID**, la **return URL** y la clave **.p8** correctamente configurados. Recuerda que Apple solo manda el **nombre en el primer login**.
- Asegúrate de que el proveedor esté **habilitado** en Supabase.

### 3. El email no llega (email not arriving)

**Síntoma:** el usuario se registra o pide restablecer contraseña, pero no recibe el correo.

**Causas y soluciones:**

- **En desarrollo:** se usan los emails por defecto de Supabase, que pueden tardar o caer en spam. Revisa la carpeta de spam.
- **En producción sin SMTP propio:** la entregabilidad es pobre. Configura **SMTP personalizado** en Supabase.
- **Faltan registros DNS:** sin **SPF**, **DKIM** y **DMARC**, los correos pueden ser rechazados o marcados como spam. Configúralos en el dominio.
- Verifica que el remitente (p. ej. `no-reply@evefitmethod.com`) esté correctamente configurado.

---

## Checklist final de despliegue

Antes de dar por terminada la autenticación en producción:

- [ ] Variables de entorno cargadas en Vercel (Production, Preview, Development)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_SECRET_KEY` **solo** en servidor, nunca en el cliente
- [ ] **Site URL** en Supabase = `https://app.evefitmethod.com`
- [ ] Todas las **Redirect URLs** agregadas en Supabase (localhost + dominios)
- [ ] Proveedores habilitados: Email (con confirmaciones), Google, Facebook, Apple
- [ ] Google: Client ID + Secret en Supabase, redirect URI autorizado
- [ ] Facebook: App ID + Secret, permisos `public_profile` + `email`
- [ ] Apple: cuenta de pago, Services ID, return URL y clave .p8
- [ ] SMTP personalizado + DNS (SPF, DKIM, DMARC) en producción
- [ ] Primera coach promovida manualmente con el `update` en SQL editor
- [ ] Flujo de invitación probado de principio a fin
- [ ] Inicio de sesión probado con email/contraseña y con cada proveedor OAuth
- [ ] Tras desplegar, **actualizar Site URL + Redirect URLs al dominio real y probar login**

> **Pendientes recomendados antes de producción** (seguridad): rate limiting + CAPTCHA en autenticación, SMTP personalizado, revisión de textos legales, y revisar 2 advisories moderados de `npm audit`. La validación de permisos siempre se hace en el servidor (guards `requireAuth` / `requireCoach` / `requireStudent` / `assertCoachOwnsStudent`), nunca se confía solo en el cliente.

---

*EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios importantes en alimentación o entrenamiento.*
