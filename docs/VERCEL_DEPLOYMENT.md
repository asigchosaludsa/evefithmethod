# Despliegue en Vercel — EveFit Method

Esta guía te lleva paso a paso para publicar **EveFit Method** en Vercel. Está escrita para que la sigas aunque no tengas experiencia técnica: cada paso indica exactamente qué botón pulsar y qué escribir.

EveFit Method es una **plataforma web responsiva** (no es una app nativa) construida con **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Supabase**. Una sola aplicación Next.js sirve por ahora todos los dominios planificados.

> **Antes de empezar necesitas tener listo:**
> - El repositorio en **GitHub** ya creado (lo creaste tú como dueña del proyecto).
> - Tu proyecto de **Supabase** ya creado, con las migraciones aplicadas y las claves a mano.
> - Una cuenta de correo para registrarte en Vercel.

---

## Índice

1. [Crear cuenta o iniciar sesión en Vercel](#1-crear-cuenta-o-iniciar-sesión-en-vercel)
2. [Conectar GitHub con Vercel](#2-conectar-github-con-vercel)
3. [Importar el repositorio](#3-importar-el-repositorio)
4. [Configurar el framework y los comandos](#4-configurar-el-framework-y-los-comandos)
5. [Añadir las variables de entorno](#5-añadir-las-variables-de-entorno)
6. [Configurar la rama de producción y los previews](#6-configurar-la-rama-de-producción-y-los-previews)
7. [Primer despliegue](#7-primer-despliegue)
8. [Lista de validación tras el despliegue](#8-lista-de-validación-tras-el-despliegue)
9. [Lista de tareas posteriores al despliegue](#9-lista-de-tareas-posteriores-al-despliegue)
10. [Dominios y SSL (opcional pero recomendado)](#10-dominios-y-ssl-opcional-pero-recomendado)

---

## 1. Crear cuenta o iniciar sesión en Vercel

1. Abre tu navegador y entra en **https://vercel.com**.
2. Pulsa **Sign Up** (Registrarse) si es tu primera vez, o **Log In** (Iniciar sesión) si ya tienes cuenta.
3. Elige iniciar sesión **con GitHub**. Esta es la opción recomendada porque conecta Vercel con tus repositorios automáticamente.
4. Autoriza a Vercel cuando GitHub te lo pida.
5. Si te pregunta por un plan, el plan **Hobby (gratuito)** es suficiente para empezar.

Cuando termines, verás el **Dashboard** (panel principal) de Vercel.

---

## 2. Conectar GitHub con Vercel

Si te registraste con GitHub en el paso anterior, la conexión probablemente ya existe. Para asegurarte:

1. En Vercel, ve a tu **avatar (esquina superior derecha) → Settings**.
2. Entra en la sección **Git** o **Integrations** y verifica que **GitHub** aparece conectado.
3. Si Vercel no ve tu repositorio más adelante, vuelve aquí y pulsa **Configure** junto a GitHub para conceder acceso al repositorio de EveFit Method (puedes dar acceso a *todos* los repositorios o solo a este).

---

## 3. Importar el repositorio

1. En el panel de Vercel pulsa **Add New… → Project** (Añadir nuevo → Proyecto).
2. En la lista **Import Git Repository** busca el repositorio de **EveFit Method**.
3. Pulsa **Import** junto a ese repositorio.

> Si no aparece, pulsa **Adjust GitHub App Permissions** / **Configure GitHub App** y concede acceso al repositorio; luego vuelve a esta pantalla.

---

## 4. Configurar el framework y los comandos

En la pantalla **Configure Project**, revisa lo siguiente:

| Campo | Valor |
|-------|-------|
| **Framework Preset** | **Next.js** |
| **Build Command** (Comando de compilación) | `npm run build` |
| **Install Command** (Comando de instalación) | `npm install` |
| **Output Directory** | Déjalo por defecto (Vercel lo detecta solo para Next.js) |
| **Root Directory** | Déjalo en la raíz (a menos que tu proyecto esté en una subcarpeta) |

El gestor de paquetes del proyecto es **npm**.

> No necesitas cambiar nada más en esta pantalla todavía. Antes de pulsar **Deploy**, añade las variables de entorno (paso 5).

### Comandos disponibles (referencia)

Estos son los comandos del proyecto. Para Vercel solo importan `npm install` y `npm run build`; el resto los usas en tu equipo local:

```bash
npm install      # instalar dependencias
npm run dev      # desarrollo local (http://localhost:3000)
npm run lint     # análisis de estilo
npm run typecheck # comprobación de tipos TypeScript
npm run test     # pruebas con Vitest
npm run build    # compilación de producción (la que usa Vercel)
```

> Nota técnica: Next.js 16 utiliza `proxy.ts` (no `middleware.ts`). Este archivo ya existe en el repositorio (`/proxy.ts`) y se encarga de refrescar la sesión de Supabase. No tienes que tocarlo.

---

## 5. Añadir las variables de entorno

Las variables de entorno guardan la configuración y las claves secretas. En la pantalla **Configure Project** abre la sección **Environment Variables**.

> **Reglas de seguridad importantes:**
> - **Nunca** subas secretos reales al repositorio. El archivo `.env.example` solo contiene plantillas, no valores reales.
> - Solo las variables que empiezan por **`NEXT_PUBLIC_`** llegan al navegador. Las demás se quedan en el servidor.
> - `SUPABASE_SECRET_KEY` y `SUPABASE_SERVICE_ROLE_KEY` son **solo de servidor**. **Jamás** deben aparecer en el código del cliente. `SUPABASE_SERVICE_ROLE_KEY` además **omite las políticas RLS** y se usa únicamente para la aceptación de invitaciones.

### Variables que debes añadir

Para cada variable, pulsa **Add**, escribe el **Name** (nombre) y el **Value** (valor), y marca los entornos donde aplica.

| Nombre | Valor de ejemplo / descripción | ¿Llega al navegador? |
|--------|-------------------------------|----------------------|
| `NEXT_PUBLIC_SITE_URL` | `https://app.evefitmethod.com` (URL de la app privada) | Sí |
| `NEXT_PUBLIC_MARKETING_URL` | `https://evefitmethod.com` (URL del landing) | Sí |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable de Supabase | Sí |
| `SUPABASE_SECRET_KEY` | Clave secreta de Supabase (**solo servidor**) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (**solo servidor**, omite RLS; solo para aceptar invitaciones) | No |

> **Sobre la clave publicable:** la app acepta **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** o, alternativamente, la variable heredada **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**. Usa una de las dos (la nueva es la recomendada).

### Variables futuras (NO las configures todavía)

Estas variables corresponden a funciones que **aún no están implementadas**. No las añadas ahora; quedan documentadas solo como referencia para el futuro:

`RESEND_API_KEY`, `POSTMARK_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### Aplicar a los tres entornos (Development / Preview / Production)

Vercel tiene tres entornos. Marca **las tres casillas** para cada variable salvo que quieras valores distintos por entorno:

- **Production** (Producción): el sitio en vivo, servido desde la rama `main`.
- **Preview** (Vista previa): despliegues automáticos de otras ramas y de los Pull Requests.
- **Development** (Desarrollo): valores que Vercel puede sincronizar con tu equipo local mediante la CLI.

> Recomendación: usa los mismos valores en los tres entornos al principio. Cuando tengas un proyecto Supabase separado para pruebas, podrás poner valores distintos en **Preview/Development**.

---

## 6. Configurar la rama de producción y los previews

1. Tras crear el proyecto (o desde **Settings → Git** dentro del proyecto), confirma que la **Production Branch** es **`main`**.
2. Cada vez que hagas *push* a `main`, Vercel publicará automáticamente en **producción**.
3. Cualquier *push* a **otras ramas** (o al abrir un Pull Request) genera un **Preview Deployment**: una URL temporal para revisar los cambios antes de fusionarlos a `main`. Estos previews usan las variables del entorno **Preview**.

---

## 7. Primer despliegue

1. Vuelve a la pantalla **Configure Project**.
2. Verifica una última vez: Framework **Next.js**, Build `npm run build`, Install `npm install`, y las variables de entorno añadidas.
3. Pulsa **Deploy**.
4. Vercel ejecutará `npm install` y luego `npm run build`. Verás el registro (log) en pantalla.
5. Cuando termine, Vercel te mostrará una **URL** del tipo `https://<tu-proyecto>.vercel.app` y un mensaje de éxito (**Congratulations**).
6. Pulsa **Visit** para abrir tu sitio.

> Si la compilación falla, lee el log: normalmente la causa es una variable de entorno faltante o mal escrita. Corrígela en **Settings → Environment Variables** y vuelve a desplegar desde la pestaña **Deployments**.

---

## 8. Lista de validación tras el despliegue

Abre la URL de Vercel y comprueba cada punto. Marca cada casilla a medida que verificas:

- [ ] **La compilación pasa** sin errores (el despliegue aparece como **Ready** en la pestaña **Deployments**).
- [ ] **Página de inicio `/`** carga correctamente (landing/portada).
- [ ] **`/login`** carga y muestra el formulario de inicio de sesión.
- [ ] **`/auth/callback`** funciona: al volver de un proveedor OAuth, intercambia el código y redirige. Si hay error, debe llevar a `/auth/auth-code-error` (no a una página rota).
- [ ] **Las rutas protegidas redirigen**: si entras sin sesión a una ruta de coach (`/coach`) o de alumna (`/student/today`), te redirige al login en lugar de mostrar contenido privado.
- [ ] **Cierre de sesión (logout)** funciona: la ruta `/auth/logout` termina la sesión y deja de mostrar contenido privado.
- [ ] **No hay secretos expuestos**: abre las herramientas de desarrollador del navegador (pestaña *Network* o *Sources*) y confirma que **no** aparecen `SUPABASE_SECRET_KEY` ni `SUPABASE_SERVICE_ROLE_KEY`. Solo deben verse variables `NEXT_PUBLIC_*`.

> **Atajo para comprobar rutas protegidas:** abre una ventana de incógnito (sin sesión) y visita directamente `https://<tu-proyecto>.vercel.app/coach`. Debe enviarte a `/login`.

---

## 9. Lista de tareas posteriores al despliegue

Una vez el sitio está en línea, falta conectar correctamente Supabase con la URL real y verificar la autenticación completa.

### 9.1 Actualizar las URLs en Supabase

En el **Dashboard de Supabase → Authentication → URL Configuration**:

- [ ] **Site URL**: `https://app.evefitmethod.com` (o tu URL real de la app).
- [ ] **Redirect URLs** — añade **todas** estas:
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

> Mientras pruebas con la URL temporal `*.vercel.app`, puedes añadirla también a las Redirect URLs para que el login funcione antes de tener el dominio definitivo.

### 9.2 Probar la autenticación

- [ ] **Login con email y contraseña** funciona (con confirmación de correo activada).
- [ ] **Restablecer / actualizar contraseña** funciona (rutas `/forgot-password`, `/reset-password`, `/update-password`).
- [ ] **OAuth con Google** inicia sesión correctamente.
- [ ] **OAuth con Facebook** inicia sesión correctamente.
- [ ] **OAuth con Apple** inicia sesión correctamente (requiere cuenta de Apple Developer de pago; Apple envía el nombre solo en el primer inicio de sesión).

> Los proveedores OAuth (Google, Facebook, Apple) se configuran **fuera de la app**, en sus respectivas consolas, y la URI de redirección autorizada es la **callback de Supabase** (`https://<project-ref>.supabase.co/auth/v1/callback`). Asegúrate de haber activado **Email, Google, Facebook y Apple** en **Supabase → Authentication → Providers**.

### 9.3 Probar la redirección por rol

El login redirige según el rol del usuario. Verifica:

- [ ] **Coach / admin** → redirige a `/coach`.
- [ ] **Alumna (student)** → redirige a `/student/today`.
- [ ] **Perfil incompleto** → redirige a `/onboarding`.
- [ ] **Usuario inactivo** → queda **bloqueado** (no accede al contenido).

> **Crear el primer coach** (se promueve manualmente): regístrate normalmente y luego, en el **SQL Editor de Supabase**, ejecuta:
> ```sql
> update public.profiles
> set role = 'coach', status = 'active', onboarding_completed = true
> where email = 'TU_EMAIL';
> ```
> Las **alumnas son solo por invitación**: el coach crea una invitación (se guarda únicamente un `token_hash` SHA-256; el enlace en crudo se muestra una sola vez como `/accept-invitation?token=...`). Un usuario que se registra solo, sin invitación, queda como alumna **sin coach** hasta que se le vincule.

### 9.4 Probar las políticas RLS (seguridad de datos)

Las **políticas RLS (Row Level Security)** están activadas en todas las tablas privadas. Inicia sesión con dos usuarios distintos y comprueba el aislamiento de datos:

- [ ] **Como alumna (student)**: solo ves **tus propios** datos (tus comidas, entrenamientos, progreso). No puedes ver los datos de otra alumna.
- [ ] **Como coach**: ves los datos de **tus alumnas asignadas**, pero no los de alumnas que no te pertenecen.
- [ ] Confirma que un usuario **no puede cambiar su propio rol** (la escalada de privilegios está bloqueada por un trigger; las llamadas que no usan la clave service role no pueden modificar su `role`).

---

## 10. Dominios y SSL (opcional pero recomendado)

Los dominios planificados son:

- **evefitmethod.com** — landing / marketing (y redirección).
- **app.evefitmethod.com** — la app privada (recomendado como `NEXT_PUBLIC_SITE_URL`).
- **www.evefitmethod.com** — alias.

Para conectarlos:

1. En el proyecto de Vercel ve a la pestaña **Domains**.
2. Tienes dos caminos:
   - **Comprar el dominio en Vercel** (más sencillo: la configuración DNS es automática), **o**
   - **Usar un registrador externo** donde ya compraste el dominio.
3. Si el dominio es **externo**, añádelo en Vercel y configura en tu registrador los **registros DNS** que Vercel te indique:
   - Para el dominio raíz (apex `evefitmethod.com`): un registro **A** o **ALIAS** según muestre Vercel.
   - Para `www` y `app`: un registro **CNAME** apuntando a `cname.vercel-dns.com`.
4. Espera a que Vercel verifique el dominio y **confirma que el SSL** (candado HTTPS) queda activo.
5. Cuando el dominio definitivo esté funcionando, vuelve al **paso 9.1** y asegúrate de que las **Site URL / Redirect URLs de Supabase** apunten al dominio real, y que `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_MARKETING_URL` en Vercel también estén correctas.

> **Configuración recomendada:** usa **app.evefitmethod.com** para la aplicación y **evefitmethod.com** para el landing / redirección.

---

## Notas finales de seguridad

Antes de considerar el proyecto listo para usuarios reales, recuerda que quedan estas tareas de pre-producción pendientes:

- **SMTP personalizado** en Supabase para los correos transaccionales (confirmación, restablecimiento, invitación, bienvenida), con remitente tipo `no-reply@evefitmethod.com` y los registros DNS **SPF, DKIM y DMARC** del dominio. En desarrollo se usan los correos por defecto de Supabase.
- **Rate limiting + CAPTCHA** en las rutas de autenticación.
- **Revisar los textos legales** (`/terms`, `/privacy`, `/disclaimer`).
- **Revisar las 2 advertencias moderadas** de `npm audit`.

Buenas prácticas que el proyecto ya aplica y que debes mantener: RLS en todas las tablas, validación de entradas con Zod, validación de permisos en el servidor, **nunca** poner claves secretas o service role en el cliente, no guardar datos sensibles en `localStorage`, evitar *open redirects* en `/auth/callback` (solo rutas relativas) y prevenir la escalada de roles.

> **Aviso de salud (texto exacto que muestra la plataforma):**
> "EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios importantes en alimentación o entrenamiento."
