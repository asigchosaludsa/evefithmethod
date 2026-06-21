# Seguridad — EveFit Method

Esta guía describe el modelo de seguridad de **EveFit Method**, la plataforma web responsive (Next.js 16 + Supabase) donde una coach gestiona a sus alumnas de fitness y nutrición. Está pensada para que la dueña del proyecto entienda cómo está protegida la aplicación y qué pasos seguir antes de salir a producción.

La regla de oro de todo el sistema: **cada quien solo ve y modifica lo que le corresponde**. La alumna ve su propia información; la coach ve la de sus alumnas asignadas; nadie puede ascenderse a sí mismo a un rol superior.

---

## 1. Modelo de roles

Existen tres roles, almacenados en la columna `role` de la tabla `profiles`:

| Rol | Estado | Qué puede hacer |
|-----|--------|-----------------|
| `student` (alumna) | Implementado | Ver y registrar su propia información: comidas, entrenamientos, progreso, fotos, contenido asignado. |
| `coach` | Implementado | Gestionar a sus alumnas asignadas: planes de nutrición, entrenamientos, ejercicios, contenido, notas y revisión diaria. |
| `admin` | Preparado, no construido del todo | Rol reservado para administración futura. No debe asumirse que está completo. |

### Cómo nace un perfil

- La tabla `profiles.id` referencia a `auth.users(id)`: cada usuario de autenticación tiene exactamente un perfil.
- El trigger `handle_new_user` (migración `0005_triggers.sql`) se dispara en `auth.users` y crea un **perfil base** con `role = NULL` y `status = 'pending'`. Es decir, un usuario recién registrado **no tiene rol todavía** y debe completar onboarding o ser vinculado.

### La primera coach se promueve a mano

No existe un botón para "convertirse en coach". La primera (y única, por ahora) coach se promueve manualmente en Supabase después de registrarse, ejecutando en el SQL editor:

```sql
update public.profiles
set role = 'coach',
    status = 'active',
    onboarding_completed = true
where email = 'TU_EMAIL';
```

> Reemplaza `TU_EMAIL` por el correo real con el que te registraste.

### Las alumnas son solo por invitación

- La coach crea una **invitación**. En la base de datos **solo se guarda el hash SHA-256 del token** (`token_hash` en la tabla `invitations`), nunca el token en texto plano.
- El enlace real se muestra **una sola vez** y tiene la forma `/accept-invitation?token=...`. Si se pierde, hay que generar una invitación nueva.
- Un usuario que se auto-registra sin invitación queda como **alumna sin coach** hasta que se le vincule.

---

## 2. RLS (Row Level Security): el corazón de la seguridad

Toda la protección de datos en la base se apoya en **RLS de Postgres**, activado en Supabase. RLS asegura que, aunque alguien obtenga la clave pública (`anon`/`publishable`) y consulte directamente la base, **solo pueda leer y escribir las filas que las políticas le permiten**.

### 2.1 RLS por tabla

- **RLS está habilitado en todas las tablas privadas.** No hay tabla privada con RLS apagado.
- Las políticas viven en la migración `0004_rls_policies.sql` y aplican a las 25 tablas del modelo:

  `profiles`, `coach_profiles`, `student_profiles`, `coach_students`, `invitations`, `nutrition_plans`, `nutrition_plan_food_recommendations`, `food_items`, `food_logs`, `food_log_items`, `workout_plans`, `workout_plan_days`, `exercises`, `workout_plan_exercises`, `workout_logs`, `workout_log_sets`, `weight_entries`, `body_measurements`, `progress_photos`, `content_posts`, `content_assignments`, `coach_notes`, `student_checkins`, `alerts`, `auth_events`.

- El patrón general: la alumna accede a **sus propias** filas; la coach accede a las filas de **sus alumnas asignadas**; los catálogos públicos (como `food_items` global y `exercises` global) son legibles según corresponda.

### 2.2 Funciones auxiliares (helper functions)

Las políticas no repiten la misma lógica una y otra vez; se apoyan en funciones definidas en la migración `0002_helpers_roles.sql`:

| Función | Para qué sirve |
|---------|----------------|
| `current_user_role()` | Devuelve el rol del usuario autenticado. |
| `is_coach()` | ¿El usuario actual es coach? |
| `is_student()` | ¿El usuario actual es alumna? |
| `is_admin()` | ¿El usuario actual es admin? |
| `coach_has_student(...)` | ¿La coach actual tiene asignada a esa alumna? |
| `set_updated_at()` | Mantiene actualizada la columna `updated_at` vía trigger. |
| `prevent_role_escalation()` | Bloquea cambios de rol no autorizados (ver abajo). |

> **Detalle técnico importante:** las funciones auxiliares son `SECURITY DEFINER` con `search_path` fijado (pinned). Esto evita ataques de manipulación del `search_path` y garantiza que se ejecuten siempre contra los objetos correctos del esquema.

### 2.3 Guarda contra escalada de roles

El cambio de rol está protegido por un **trigger** (`prevent_role_escalation`, registrado en `0003_core_tables.sql` y definido en `0002_helpers_roles.sql`):

- **Un usuario normal NO puede cambiar su propio `role`.** Aunque intente un `update` directo sobre su fila de `profiles`, el trigger lo impide.
- Solo el rol de servicio (service role) — que **omite RLS** — puede realizar ciertos cambios privilegiados, y este se usa exclusivamente desde el servidor para la aceptación de invitaciones.

Esto significa que, incluso si un atacante tuviera la clave pública del navegador, **no podría ascenderse a `coach` ni a `admin`**.

---

## 3. Privacidad del almacenamiento (Storage)

Supabase Storage usa cuatro buckets, configurados en la migración `0006_storage.sql`:

| Bucket | Acceso | Contenido |
|--------|--------|-----------|
| `food-photos` | **Privado** | Fotos de comidas. |
| `progress-photos` | **Privado** | Fotos de progreso. |
| `exercise-videos` | **Privado** | Videos de ejercicios. |
| `avatars` | **Lectura pública** | Imágenes de avatar. |

### Reglas de acceso

- **Convención de ruta:** `<owner_uuid>/<filename>`. El nombre de la carpeta es el UUID del dueño.
- La **alumna lee y escribe solo en su propia carpeta**.
- La **coach asignada puede leer** los archivos de sus alumnas.
- Las políticas de Storage hacen cumplir esto: nadie ve fotos privadas de otra persona sin autorización.

### Tipos y tamaños permitidos

- **Imágenes permitidas:** `jpg`, `jpeg`, `png`, `webp`.
- **Videos (futuro):** `mp4`, `mov`.
- **Tamaños máximos sugeridos:** fotos ~5 MB, videos ~50 MB.
- Estos límites se aplican **del lado del cliente** y/o mediante la configuración del bucket.

---

## 4. Variables de entorno: públicas vs. solo servidor

Esta es una de las partes más sensibles. **La regla absoluta:** solo las variables con prefijo `NEXT_PUBLIC_` llegan al navegador. Todas las demás son secretas y viven únicamente en el servidor.

Archivo de referencia: `.env.example`. **Nunca** se suben secretos reales al repositorio.

### Variables públicas (llegan al navegador — está bien)

```dotenv
NEXT_PUBLIC_SITE_URL=https://app.evefitmethod.com
NEXT_PUBLIC_MARKETING_URL=https://evefitmethod.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# (o la heredada NEXT_PUBLIC_SUPABASE_ANON_KEY — la app acepta cualquiera de las dos)
```

> Estas claves públicas son seguras de exponer **porque RLS protege los datos**. La seguridad real no depende de ocultarlas, sino de las políticas de la base.

### Variables solo de servidor (NUNCA en el navegador)

```dotenv
SUPABASE_SECRET_KEY=          # solo servidor
SUPABASE_SERVICE_ROLE_KEY=    # solo servidor; OMITE RLS; uso exclusivo: aceptación de invitaciones
```

- `SUPABASE_SERVICE_ROLE_KEY` **omite RLS por completo**. Si se filtra al cliente, cualquiera podría leer y modificar toda la base. Su único uso autorizado es la **aceptación de invitaciones** desde el servidor.
- Estas variables **no** llevan prefijo `NEXT_PUBLIC_`, por lo que Next.js no las incluye en el bundle del navegador.

### Variables futuras (NO implementadas todavía)

No están en uso; se documentan solo para referencia: `RESEND_API_KEY`, `POSTMARK_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

---

## 5. Autenticación y notas de OAuth

La autenticación se gestiona con **Supabase Auth**.

### Métodos soportados

- **Email + contraseña** con confirmación por correo.
- **Restablecer y actualizar contraseña.**
- **OAuth** con Google, Facebook y Apple.

### Rutas de autenticación implementadas

- `/auth/callback` — intercambia el código de OAuth, **valida el parámetro `next`**, redirige según el rol y, ante errores, envía a `/auth/auth-code-error`.
- `/auth/confirm` — verificación del OTP de email.
- `/auth/logout` — cierre de sesión.
- `/auth/auth-code-error` — página de error de autenticación.

### Redirección por rol al iniciar sesión

| Situación | Destino |
|-----------|---------|
| `coach` / `admin` | `/coach` |
| `student` | `/student/today` |
| Perfil incompleto | `/onboarding` |
| Cuenta inactiva | Bloqueada |

### Sesión y `proxy.ts`

Next.js 16 usa `proxy.ts` (no `middleware.ts`). En este repositorio ya existe en `/proxy.ts` y se encarga de **refrescar la sesión de Supabase** en cada petición.

### Configuración del panel de Supabase (Auth)

- **Site URL:** `https://app.evefitmethod.com`
- **Redirect URLs (agregar todas):**

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

- **Proveedores a habilitar:** Email (con confirmaciones), Google, Facebook, Apple.

### Configuración manual de proveedores OAuth (fuera de la app)

- **Google:** Google Cloud Console → OAuth consent screen → crear OAuth Client ID (Web) → URI de redirección autorizada = el callback de Supabase mostrado en *Auth > Providers > Google* (`https://<project-ref>.supabase.co/auth/v1/callback`) → copiar Client ID + Secret en Supabase.
- **Facebook:** Meta for Developers → crear app → añadir Facebook Login → *Valid OAuth Redirect URIs* = callback de Supabase → permisos `public_profile` y `email` → copiar App ID + App Secret en Supabase.
- **Apple:** requiere cuenta de pago de Apple Developer → crear un Services ID → configurar dominio + return URL (callback de Supabase) → crear una clave `.p8` de *Sign in with Apple* → configurarla en Supabase. **Nota:** Apple envía el nombre del usuario **solo en el primer inicio de sesión**.

### Correo electrónico

- En desarrollo se usan los correos por defecto de Supabase.
- En **producción** se necesita **SMTP personalizado** en la configuración de Auth de Supabase, con remitente tipo `no-reply@evefitmethod.com`, además de los registros DNS **SPF, DKIM y DMARC** en el dominio.
- Correos transaccionales: confirmación de email, restablecer contraseña, invitación y bienvenida.

---

## 6. Prevención de open redirects (redirecciones abiertas)

Una **redirección abierta** ocurre cuando un atacante manipula un parámetro para enviar al usuario a un sitio externo malicioso tras el login.

- En `/auth/callback` se **valida el parámetro `next`** y **solo se permiten rutas relativas**.
- Nunca se debe redirigir a una URL absoluta proporcionada por el usuario sin validarla.
- Ante cualquier fallo en el intercambio del código, se redirige a `/auth/auth-code-error`.

---

## 7. XSS y saneamiento de contenido

- El contenido que crea la coach (publicaciones en `content_posts`, notas, recomendaciones) debe **sanearse antes de mostrarse** para evitar inyección de scripts (XSS).
- Toda entrada del usuario se **valida con Zod** (Zod v4) antes de procesarse.
- React escapa por defecto el contenido renderizado; aun así, cualquier render de HTML proveniente de contenido del usuario debe pasar por saneamiento explícito.

---

## 8. Validación de permisos del lado del servidor

RLS protege la base de datos, pero la aplicación **también valida permisos en el servidor** mediante guardas:

| Guarda | Qué exige |
|--------|-----------|
| `requireAuth` | Que haya una sesión válida. |
| `requireCoach` | Que el usuario sea coach. |
| `requireStudent` | Que el usuario sea alumna. |
| `assertCoachOwnsStudent` | Que la coach realmente tenga asignada a esa alumna. |

Esta es una **defensa en profundidad**: aunque RLS ya restringe los datos, las guardas evitan operaciones indebidas a nivel de aplicación.

---

## 9. Riesgos pendientes (antes de producción)

Los siguientes puntos **aún no están implementados** y deben atenderse antes del lanzamiento:

- **Rate limiting + CAPTCHA** en los formularios de autenticación (registro, login, restablecer contraseña). Sin esto, las rutas de auth son vulnerables a ataques de fuerza bruta y abuso automatizado.
- **SMTP personalizado** en producción (hoy se usan los correos por defecto de Supabase).
- **Revisión de los textos legales** (`/terms`, `/privacy`, `/disclaimer`) por la persona adecuada.
- **2 avisos de severidad moderada en `npm audit`** pendientes de revisar.
- El rol `admin` está **preparado pero no construido del todo**; no debe confiarse en él como mecanismo completo de administración.

---

## 10. Lista de "NO hacer" (prohibiciones)

- **NO** subir secretos reales al repositorio. `.env.example` es solo una plantilla.
- **NO** poner `SUPABASE_SECRET_KEY` ni `SUPABASE_SERVICE_ROLE_KEY` (ni ninguna clave sin prefijo `NEXT_PUBLIC_`) en código que llegue al navegador.
- **NO** usar la `service role key` para nada que no sea la aceptación de invitaciones del lado del servidor (omite RLS).
- **NO** desactivar RLS en ninguna tabla privada.
- **NO** guardar datos sensibles en `localStorage`.
- **NO** permitir redirecciones a URLs absolutas en `/auth/callback`; solo rutas relativas.
- **NO** renderizar contenido del usuario o de la coach sin saneamiento.
- **NO** confiar únicamente en validaciones del cliente: validar siempre permisos y entradas también en el servidor (Zod + guardas).
- **NO** permitir que un usuario cambie su propio rol; el trigger lo impide y no debe eludirse.
- **NO** guardar el token de invitación en texto plano: solo el hash SHA-256.
- **NO** salir a producción sin volver a apuntar el *Site URL* y las *Redirect URLs* de Supabase al dominio real.

---

## 11. Checklist de seguridad pre-producción

Marca cada casilla antes de lanzar:

### Base de datos y RLS

- [ ] Migraciones aplicadas **en orden** (`0001` → `0006`) en el SQL editor de Supabase o vía Supabase CLI.
- [ ] RLS habilitado y verificado en **las 25 tablas privadas**.
- [ ] Funciones auxiliares `SECURITY DEFINER` con `search_path` fijado, confirmadas.
- [ ] Trigger de escalada de roles (`prevent_role_escalation`) activo y probado (un usuario normal no puede cambiar su `role`).
- [ ] Trigger `handle_new_user` crea perfiles con `role = NULL` y `status = 'pending'`.

### Roles y acceso

- [ ] Primera coach promovida manualmente con el `update` sobre `profiles`.
- [ ] Probado el flujo de invitación: solo se guarda el `token_hash` SHA-256; el enlace `/accept-invitation?token=...` se muestra una sola vez.
- [ ] Verificado que una alumna no puede leer datos de otra alumna ni de otra coach.

### Variables de entorno

- [ ] Ningún secreto real en el repositorio.
- [ ] Variables públicas (`NEXT_PUBLIC_*`) y secretas (`SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) configuradas en Vercel para **Production, Preview y Development**.
- [ ] Confirmado que la `service role key` solo se usa en el servidor (aceptación de invitaciones).

### Autenticación

- [ ] *Site URL* y *Redirect URLs* de Supabase actualizadas al dominio real.
- [ ] Proveedores OAuth (Google, Facebook, Apple) configurados y probados.
- [ ] Probada la validación del parámetro `next` en `/auth/callback` (solo rutas relativas).
- [ ] Redirección por rol verificada (coach/admin → `/coach`; alumna → `/student/today`; perfil incompleto → `/onboarding`; inactiva → bloqueada).

### Almacenamiento

- [ ] Buckets creados con la privacidad correcta (`food-photos`, `progress-photos`, `exercise-videos` privados; `avatars` lectura pública).
- [ ] Políticas de Storage probadas: cada quien accede solo a su carpeta `<owner_uuid>/...`; la coach lee la de sus alumnas.
- [ ] Límites de tipo (jpg/jpeg/png/webp) y tamaño (fotos ~5 MB) aplicados.

### Contenido y entradas

- [ ] Validación con Zod en todas las entradas del usuario.
- [ ] Guardas del servidor (`requireAuth`, `requireCoach`, `requireStudent`, `assertCoachOwnsStudent`) aplicadas en las rutas correspondientes.
- [ ] Saneamiento del contenido de la coach antes de renderizarlo.

### Correo y dominio

- [ ] SMTP personalizado configurado en Supabase (remitente `no-reply@evefitmethod.com`).
- [ ] Registros DNS **SPF, DKIM y DMARC** configurados en el dominio.
- [ ] SSL confirmado en Vercel para todos los dominios.

### Riesgos pendientes

- [ ] Rate limiting + CAPTCHA añadidos a los formularios de autenticación.
- [ ] Textos legales (`/terms`, `/privacy`, `/disclaimer`) revisados.
- [ ] Los 2 avisos moderados de `npm audit` revisados y resueltos.

### Verificación final

- [ ] `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` pasan sin errores.
- [ ] Login real probado en el dominio de producción.

---

## Aviso de salud

> EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios importantes en alimentación o entrenamiento.
