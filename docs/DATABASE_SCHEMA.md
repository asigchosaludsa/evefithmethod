# Esquema de Base de Datos — EveFit Method

Este documento describe el esquema de base de datos de **EveFit Method**, la plataforma web responsive (no app nativa) de coaching de fitness y nutrición donde una coach gestiona a sus alumnas. La base de datos vive en **Supabase (Postgres)** e incluye autenticación, almacenamiento y seguridad a nivel de fila (RLS).

Idea central del producto: la alumna sabe qué hacer hoy; la coach sabe a quién revisar hoy. El esquema está diseñado alrededor de esa relación coach–alumna.

---

## Visión general

La base de datos tiene **25 tablas**. La tabla central es **`profiles`**: cada usuario autenticado tiene un perfil, y casi todo lo demás se conecta a un perfil (de coach o de alumna).

A continuación las 25 tablas agrupadas por área funcional, cada una con su propósito en una línea.

### Identidad y roles

| Tabla | Propósito |
|---|---|
| `profiles` | Perfil base de cada usuario; su `id` referencia a `auth.users(id)`. Guarda el rol, el estado y el progreso de onboarding. |
| `coach_profiles` | Datos específicos de una coach (extiende el perfil cuando el rol es `coach`). |
| `student_profiles` | Datos específicos de una alumna (extiende el perfil cuando el rol es `student`). |

### Relaciones e invitaciones

| Tabla | Propósito |
|---|---|
| `coach_students` | Vínculo entre una coach y cada una de sus alumnas (la relación de coaching). |
| `invitations` | Invitaciones que crea la coach para incorporar alumnas; solo guarda el `token_hash` (SHA-256), nunca el enlace en texto plano. |

### Nutrición

| Tabla | Propósito |
|---|---|
| `nutrition_plans` | Planes de nutrición que la coach asigna a sus alumnas. |
| `nutrition_plan_food_recommendations` | Alimentos recomendados dentro de un plan de nutrición. |
| `food_items` | Catálogo de alimentos con sus macros (incluye alimentos públicos compartidos). |
| `food_logs` | Registro diario de comidas de cada alumna (la entrada del día). |
| `food_log_items` | Los alimentos concretos que componen cada registro de comida. |

### Entrenamiento

| Tabla | Propósito |
|---|---|
| `workout_plans` | Planes de entrenamiento que la coach asigna a sus alumnas. |
| `workout_plan_days` | Días que componen un plan de entrenamiento. |
| `exercises` | Catálogo de ejercicios (incluye ejercicios globales compartidos). |
| `workout_plan_exercises` | Ejercicios asignados a cada día del plan, con sus parámetros. |
| `workout_logs` | Registro de cada sesión de entrenamiento realizada por la alumna. |
| `workout_log_sets` | Las series (sets) registradas dentro de cada sesión de entrenamiento. |

### Progreso

| Tabla | Propósito |
|---|---|
| `weight_entries` | Registros de peso corporal de la alumna a lo largo del tiempo. |
| `body_measurements` | Medidas corporales (circunferencias, etc.) de la alumna. |
| `progress_photos` | Fotos de progreso de la alumna (almacenadas de forma privada). |

### Contenido

| Tabla | Propósito |
|---|---|
| `content_posts` | Publicaciones de contenido (tips, material formativo) creadas por la coach. |
| `content_assignments` | Asignación de una publicación de contenido a una o varias alumnas. |

### Coaching y alertas

| Tabla | Propósito |
|---|---|
| `coach_notes` | Notas privadas que la coach toma sobre cada alumna. |
| `student_checkins` | Check-ins periódicos de la alumna (su seguimiento subjetivo). |
| `alerts` | Alertas generadas por reglas (ej. sin registros de comida, proteína baja, entrenos perdidos) que indican a quién revisar. |

### Auditoría

| Tabla | Propósito |
|---|---|
| `auth_events` | Eventos de autenticación registrados para auditoría. |

---

## Campos clave y claves foráneas

Estos son los puntos de conexión más importantes del esquema. Salvo indicación expresa, las tablas privadas tienen disparadores que mantienen una columna `updated_at` actualizada automáticamente.

### `profiles` (tabla central)

- **`id`** — referencia a **`auth.users(id)`**. Es la identidad del usuario en todo el sistema.
- **`role`** — uno de `'coach'`, `'student'` o `'admin'` (el rol `admin` está preparado pero no completamente construido). Puede empezar en `NULL`.
- **`status`** — estado del usuario; los nuevos usuarios empiezan en `'pending'`. Un usuario `inactive` queda bloqueado al iniciar sesión.
- **`onboarding_completed`** — indica si el usuario terminó el onboarding.
- **`email`** — correo del usuario (se usa, por ejemplo, para promover manualmente a la primera coach).

El rol no puede ser modificado por el propio usuario: un disparador previene la escalada de privilegios (ver más abajo).

### Identidad extendida

- **`coach_profiles`** y **`student_profiles`** extienden a `profiles`: cada uno referencia el `id` del perfil correspondiente según el rol.

### Relación coach–alumna

- **`coach_students`** vincula una coach con una alumna. Es la tabla que define quién puede ver los datos de quién: la función `coach_has_student` se apoya en esta relación.
- **`invitations`** referencia a la coach que invita y guarda únicamente el `token_hash` (hash SHA-256). El enlace crudo (`/accept-invitation?token=...`) se muestra una sola vez al crearlo y no se almacena.

### Nutrición

- **`nutrition_plans`** pertenece a una alumna y es creado/asignado por una coach.
- **`nutrition_plan_food_recommendations`** referencia a `nutrition_plans` y a `food_items`.
- **`food_logs`** pertenece a la alumna (registro del día) y **`food_log_items`** referencia a `food_logs` y a `food_items`.

### Entrenamiento

- **`workout_plans`** pertenece a una alumna; **`workout_plan_days`** referencia al plan; **`workout_plan_exercises`** referencia al día (`workout_plan_days`) y al ejercicio (`exercises`).
- **`workout_logs`** pertenece a la alumna; **`workout_log_sets`** referencia a `workout_logs`.

### Progreso

- **`weight_entries`**, **`body_measurements`** y **`progress_photos`** pertenecen cada una a la alumna que las registra.

### Contenido

- **`content_posts`** es creado por la coach; **`content_assignments`** referencia a `content_posts` y a la alumna destinataria.

### Coaching y alertas

- **`coach_notes`** referencia a la coach (autora) y a la alumna (sujeto de la nota).
- **`student_checkins`** pertenece a la alumna.
- **`alerts`** está asociada a una alumna (y es visible para su coach) e indica el motivo de revisión.

---

## Diagrama de relaciones (texto)

`profiles` está en el centro. Todo lo demás cuelga de un perfil de coach o de alumna.

```
                          auth.users
                              │  (profiles.id → auth.users.id)
                              ▼
                          ┌─────────┐
            coach_profiles│ profiles│ student_profiles
                  ◄───────┤ (centro)├───────►
                          └────┬────┘
                               │
        ┌──────────────────────┼──────────────────────────┐
        │                      │                           │
   coach_students         invitations                 (datos de alumna)
   (coach ↔ alumna)    (creadas por coach,                 │
        │              guardan token_hash)                 │
        │                                                   │
        ▼                                                   ▼
   La coach ve a sus alumnas                    ┌──────────────────────────┐
                                                │  NUTRICIÓN                │
                                                │  nutrition_plans          │
                                                │    └ nutrition_plan_food_recommendations → food_items
                                                │  food_logs                │
                                                │    └ food_log_items → food_items
                                                ├──────────────────────────┤
                                                │  ENTRENAMIENTO            │
                                                │  workout_plans            │
                                                │    └ workout_plan_days    │
                                                │        └ workout_plan_exercises → exercises
                                                │  workout_logs             │
                                                │    └ workout_log_sets     │
                                                ├──────────────────────────┤
                                                │  PROGRESO                 │
                                                │  weight_entries           │
                                                │  body_measurements        │
                                                │  progress_photos          │
                                                ├──────────────────────────┤
                                                │  CONTENIDO                │
                                                │  content_posts (coach)    │
                                                │    └ content_assignments → alumna
                                                ├──────────────────────────┤
                                                │  COACHING Y ALERTAS       │
                                                │  coach_notes              │
                                                │  student_checkins         │
                                                │  alerts                   │
                                                └──────────────────────────┘

   AUDITORÍA: auth_events (eventos de autenticación)
```

Catálogos compartidos: **`food_items`** y **`exercises`** pueden contener registros públicos/globales (sembrados en `seed.sql`) además de los propios de cada coach.

---

## Reglas RLS principales (en lenguaje sencillo)

La **seguridad a nivel de fila (RLS) está habilitada en todas las tablas privadas**. Las políticas se apoyan en funciones auxiliares definidas en la migración `0002_helpers_roles.sql`. Estas funciones son `SECURITY DEFINER` con `search_path` fijado (pinned) por seguridad.

Funciones auxiliares disponibles:

- `current_user_role` — devuelve el rol del usuario actual.
- `is_coach` — indica si el usuario actual es coach.
- `is_student` — indica si el usuario actual es alumna.
- `is_admin` — indica si el usuario actual es admin.
- `coach_has_student` — indica si la coach actual tiene asignada a una alumna concreta (se apoya en `coach_students`).

Reglas en palabras simples:

- **Cada usuario ve su propio perfil.** El acceso parte de `auth.uid()` comparado con `profiles.id`.
- **La alumna solo accede a sus propios datos** de nutrición, entrenamiento y progreso (sus planes, sus registros, sus pesos, sus medidas, sus fotos).
- **La coach accede a los datos de sus alumnas asignadas**, y solo de ellas: las políticas usan `coach_has_student` para comprobar que existe la relación en `coach_students`.
- **El rol no se puede auto-escalar.** Un disparador previene la escalada de roles: una persona que llama sin la service role *no puede* cambiar su propio rol. Esto evita que una alumna se convierta en coach o admin por su cuenta.
- **Las invitaciones nunca exponen el token.** Solo se guarda el `token_hash` (SHA-256); el enlace real se muestra una única vez.
- **El contenido se ve según asignación.** Una alumna ve una publicación cuando existe la `content_assignment` correspondiente.
- **La service role omite RLS** y se usa **únicamente para la aceptación de invitaciones** (clave `SUPABASE_SERVICE_ROLE_KEY`, solo en servidor). Nunca debe llegar al navegador.

> Recuerda: además de RLS, la aplicación valida permisos en el servidor con guards (`requireAuth`, `requireCoach`, `requireStudent`, `assertCoachOwnsStudent`) y valida la entrada con Zod. RLS es la última línea de defensa, no la única.

### Roles del sistema

- **`coach`** — gestiona alumnas, planes y contenido.
- **`student`** (alumna) — registra y consulta sus propios datos.
- **`admin`** — preparado, aún no completamente construido.

#### Promover a la primera coach (manual)

El primer rol de coach se asigna a mano. Tras registrarte en la app, ejecuta en el SQL editor de Supabase:

```sql
update public.profiles
set role = 'coach', status = 'active', onboarding_completed = true
where email = 'TU_EMAIL';
```

#### Cómo se crean las alumnas

- Las alumnas son **solo por invitación**: la coach crea una invitación y se muestra una vez el enlace `/accept-invitation?token=...`.
- Un usuario que se registra **sin invitación** queda como alumna **sin coach** hasta que se le vincule.
- El disparador `handle_new_user` (migración `0005`) crea automáticamente un perfil base para cada nuevo usuario de `auth.users`, con `role = NULL` y `status = 'pending'`.

---

## Orden de las migraciones

Las migraciones SQL viven en **`supabase/migrations/`** y se aplican **en orden** en el SQL editor de Supabase (o con la Supabase CLI). El orden importa: cada migración depende de las anteriores.

- [ ] **`0001_extensions.sql`** — habilita las extensiones `pgcrypto` y `citext`.
- [ ] **`0002_helpers_roles.sql`** — funciones auxiliares de RLS (`current_user_role`, `is_coach`, `is_student`, `is_admin`, `coach_has_student`), además de `set_updated_at` y `prevent_role_escalation`.
- [ ] **`0003_core_tables.sql`** — las **25 tablas** + índices + disparadores de `updated_at` + el disparador de protección de rol.
- [ ] **`0004_rls_policies.sql`** — habilita RLS y define las políticas en todas las tablas.
- [ ] **`0005_triggers.sql`** — disparador `handle_new_user` sobre `auth.users` que crea un perfil base (rol `NULL`, estado `'pending'`).
- [ ] **`0006_storage.sql`** — buckets de almacenamiento + políticas de Storage.

Después, de forma **opcional**:

- [ ] **`supabase/seed.sql`** — siembra `food_items` públicos y `exercises` globales; los tips de ejemplo solo se crean si ya existe una coach.

### Buckets de almacenamiento (definidos en `0006`)

| Bucket | Acceso | Contenido |
|---|---|---|
| `food-photos` | privado | fotos de comidas |
| `progress-photos` | privado | fotos de progreso |
| `exercise-videos` | privado | videos de ejercicios (a futuro) |
| `avatars` | lectura pública | imágenes de perfil |

Convención de rutas: **`<owner_uuid>/<filename>`**. La alumna lee y escribe en su propia carpeta; la coach asignada puede leer. Tipos de imagen permitidos: `jpg`, `jpeg`, `png`, `webp`. Videos a futuro: `mp4`, `mov`. Tamaños máximos sugeridos: fotos ~5 MB, videos ~50 MB (se aplican en el cliente o vía ajustes del bucket).

---

## Regenerar los tipos de TypeScript

Tras cambiar el esquema (nuevas tablas, columnas, etc.), regenera los tipos de TypeScript con la Supabase CLI:

```bash
supabase gen types
```

Esto mantiene los tipos del proyecto alineados con el esquema real de Postgres, de modo que el código TypeScript (en modo strict) refleje las tablas y columnas actuales.

---

## Notas de seguridad relacionadas con la base de datos

- RLS habilitado en cada tabla privada.
- Validar la entrada con **Zod** y los permisos en el servidor con los guards.
- Las claves secretas/de servicio (`SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) son **solo de servidor** y nunca deben aparecer en el navegador. Solo las variables `NEXT_PUBLIC_*` llegan al cliente.
- La `service role` omite RLS y se usa exclusivamente para la aceptación de invitaciones.
- No guardar datos sensibles en `localStorage`.
- Prevención de escalada de roles mediante disparador.

---

> **Aviso de salud:** EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios importantes en alimentación o entrenamiento.
