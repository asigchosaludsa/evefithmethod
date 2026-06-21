# Flujos del producto — EveFit Method

Esta guía describe, paso a paso, los **flujos de uso** principales de EveFit Method: qué hace cada persona, en qué orden y a través de qué rutas de la aplicación.

EveFit Method es una **plataforma web responsive** (no es app nativa ni Expo) para coaching de fitness y nutrición: una coach gestiona a sus alumnas. La idea central es simple:

- **La alumna sabe qué hacer hoy.**
- **La coach sabe a quién revisar hoy.**

> **Aviso de salud:** EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios importantes en alimentación o entrenamiento.

---

## Roles y puntos de entrada

| Rol | Tras iniciar sesión va a | Idea clave |
|-----|--------------------------|------------|
| `coach` / `admin` | `/coach` | Ver a quién revisar hoy y gestionar a sus alumnas |
| `student` (alumna) | `/student/today` | Saber qué tiene que hacer hoy y registrarlo |
| Perfil incompleto | `/onboarding` | Completar datos antes de usar la app |
| Cuenta inactiva | (bloqueada) | No puede entrar hasta activarse |

El redireccionamiento por rol al iniciar sesión es automático. Lo gestionan las rutas de autenticación (`/auth/callback`, `/auth/confirm`) junto con los guards del servidor.

---

## 1. Flujo de la coach

**Objetivo:** entrar, ver el panel (radar), priorizar a quién revisar, abrir a una alumna y crear planes o notas.

### Pasos

1. **Iniciar sesión** en `/login` (email + contraseña, o con Google / Facebook / Apple).
2. El sistema detecta el rol `coach` y redirige al **panel** en `/coach`.
3. **Revisar el radar de prioridades.** El panel `/coach` muestra a quién conviene revisar hoy, apoyado en las **alertas** del sistema:
   - sin registros de comida,
   - proteína baja,
   - entrenamientos perdidos,
   - subida de peso (pico),
   - progreso positivo (para reconocer avances).
4. **Abrir la lista completa de alumnas** en `/coach/students` para ver el conjunto y entrar a cualquiera.
5. **Abrir la ficha de una alumna** en `/coach/students/[studentId]`. Desde la ficha hay sub-secciones:
   - `/coach/students/[studentId]/nutrition` — su nutrición,
   - `/coach/students/[studentId]/workouts` — sus entrenamientos,
   - `/coach/students/[studentId]/progress` — su progreso.
6. **Crear o ajustar un plan de nutrición** (tablas `nutrition_plans` y `nutrition_plan_food_recommendations`), gestionable también desde la zona general `/coach/nutrition`.
7. **Crear o ajustar un plan de entrenamiento** (tablas `workout_plans`, `workout_plan_days`, `workout_plan_exercises`), gestionable también desde `/coach/workouts`.
8. **Dejar una nota de coach** para la alumna (tabla `coach_notes`).
9. (Opcional) **Gestionar el catálogo de ejercicios** en `/coach/exercises` (crear en `/coach/exercises/new`, editar en `/coach/exercises/[id]`).
10. (Opcional) **Gestionar contenido** en `/coach/content` (crear en `/coach/content/new`, editar en `/coach/content/[id]`) para luego asignarlo (tablas `content_posts`, `content_assignments`).
11. **Ajustar su configuración** en `/coach/settings`.

> **Permisos:** la coach solo puede ver y editar a sus propias alumnas. Esto se valida en el servidor con los guards `requireCoach` y `assertCoachOwnsStudent`, además de las políticas RLS de la base de datos.

### Rutas relevantes de la coach

```text
/coach                                   Panel / radar de prioridades
/coach/students                          Lista de alumnas
/coach/students/invite                   Invitar a una nueva alumna
/coach/students/[studentId]              Ficha de una alumna
/coach/students/[studentId]/nutrition    Nutrición de la alumna
/coach/students/[studentId]/workouts     Entrenamientos de la alumna
/coach/students/[studentId]/progress     Progreso de la alumna
/coach/nutrition                         Nutrición (zona general)
/coach/workouts                          Entrenamientos (zona general)
/coach/exercises  /new  /[id]            Catálogo de ejercicios
/coach/content    /new  /[id]            Contenido
/coach/settings                          Configuración
```

---

## 2. Flujo de la alumna

**Objetivo:** entrar, ver qué toca hoy, registrar una comida, registrar un entrenamiento y revisar su progreso.

### Pasos

1. **Iniciar sesión** en `/login` (email + contraseña, o con Google / Facebook / Apple).
2. El sistema detecta el rol `student` y redirige a **hoy** en `/student/today`.
3. **Ver el día** en `/student/today`: lo que tiene que hacer hoy según sus planes asignados.
4. **Registrar una comida** desde `/student/meals` (crear un registro en `/student/meals/new`). Ver el detalle en la sección **Flujo de registro de comidas** más abajo.
5. **Registrar un entrenamiento** en `/student/workout`. Ver el detalle en la sección **Flujo de registro de entrenamiento**.
6. **Revisar su progreso** en `/student/progress` (peso, medidas y fotos de evolución).
7. (Opcional) **Consultar el contenido** asignado por la coach en `/student/content`.
8. (Opcional) **Editar su perfil** en `/student/profile`.

> **Nota:** la entrada `/student` redirige a `/student/today`.

### Rutas relevantes de la alumna

```text
/student            -> redirige a /student/today
/student/today      Qué hacer hoy
/student/meals      Comidas (registro en /student/meals/new)
/student/workout    Entrenamiento del día
/student/progress   Progreso (peso, medidas, fotos)
/student/content    Contenido asignado
/student/profile    Perfil
```

---

## 3. Flujo de registro de comidas (meal-logging)

**Objetivo:** que la alumna registre lo que comió buscando alimentos, ajustando gramos, viendo los macros en vivo y, si se desvía, recibiendo el **Macro Rescue**.

**Ruta principal:** `/student/meals` → `/student/meals/new`.

### Pasos

1. La alumna abre `/student/meals` y pulsa para crear un nuevo registro en `/student/meals/new`.
2. **Buscar un alimento** en el catálogo (`food_items`, que incluye alimentos públicos del seed).
3. **Indicar la cantidad en gramos** del alimento elegido.
4. **Ver los macros en vivo:** a medida que se ajustan los gramos, la app recalcula calorías y macronutrientes al instante.
5. **Añadir tantos alimentos como haga falta** al registro; cada alimento es una línea del registro (`food_log_items`) y el conjunto forma un registro de comida (`food_logs`).
6. **Revisar los totales diarios** y el avance respecto al objetivo (progreso de macros).
7. **Macro Rescue:** si la alumna se está desviando de sus objetivos, el sistema ofrece recomendaciones **basadas en reglas** para reencauzar los macros del día.
8. **Guardar** el registro.

> La lógica de cálculo (macros, totales diarios, progreso de macros, Macro Rescue y adherencia) es **TypeScript puro**, está aislada del resto de la app y cubierta con pruebas (Vitest).

### Cómo el cálculo se nutre de los datos

```text
food_items      -> alimentos disponibles para buscar
food_logs       -> el registro de comida (cabecera)
food_log_items  -> cada alimento con sus gramos dentro del registro
```

---

## 4. Flujo de registro de entrenamiento (workout-logging)

**Objetivo:** que la alumna registre el entrenamiento del día, serie por serie.

**Ruta principal:** `/student/workout`.

### Pasos

1. La alumna abre `/student/workout` y ve el entrenamiento del día según su plan asignado (`workout_plans`, `workout_plan_days`, `workout_plan_exercises`).
2. **Registrar el entrenamiento** (`workout_logs`).
3. **Anotar cada serie** del ejercicio: repeticiones y carga (`workout_log_sets`).
4. **Ver el resumen** del entrenamiento (la lógica calcula volumen, porcentaje de finalización y, cuando aplica, 1RM estimado).
5. **Guardar** el registro.

> La adherencia semanal de entrenamiento y el resto de métricas se calculan con la lógica de dominio testada (Vitest). Las alertas de "entrenamientos perdidos" alimentan el radar de la coach.

### Datos implicados

```text
workout_plans            -> el plan
workout_plan_days        -> los días del plan
workout_plan_exercises   -> los ejercicios de cada día
exercises                -> catálogo de ejercicios (globales del seed + de la coach)
workout_logs             -> el entrenamiento registrado
workout_log_sets         -> cada serie registrada
```

---

## 5. Flujo de invitación (de extremo a extremo)

**Objetivo:** dar de alta a una nueva alumna. Las alumnas son **solo por invitación**; la coach genera la invitación y comparte un enlace de un solo uso.

> **Seguridad:** de la invitación **solo se guarda un hash SHA-256 del token** (`token_hash`) en la tabla `invitations`. El enlace con el token en claro se muestra **una sola vez**.

### Pasos

1. **La coach crea la invitación** desde `/coach/students/invite`.
2. El sistema genera el enlace de un solo uso y **lo muestra una única vez**, con el formato:
   ```text
   /accept-invitation?token=...
   ```
   La coach copia ese enlace y se lo hace llegar a la alumna.
3. **La alumna abre el enlace** `/accept-invitation?token=...`.
4. La alumna **crea su cuenta / acepta la invitación**. La aceptación de invitaciones es el **único** punto del sistema que usa la clave de servicio (`SUPABASE_SERVICE_ROLE_KEY`, solo en el servidor) para poder vincular correctamente a la alumna con su coach saltándose RLS de forma controlada.
5. Al registrarse, un trigger de base de datos (`handle_new_user`) crea un **perfil base** con `role` en `NULL` y `status` en `'pending'`.
6. La alumna queda **vinculada a su coach** (relación en `coach_students`) y obtiene el rol `student`.
7. **Si una persona se registra por su cuenta sin invitación**, queda como alumna **sin coach** hasta que se la vincule.
8. La alumna completa el **onboarding** en `/onboarding` si su perfil aún está incompleto, y a partir de ahí entra a `/student/today`.

### Checklist de la coach para invitar

- [ ] Abrir `/coach/students/invite`.
- [ ] Generar la invitación.
- [ ] **Copiar el enlace en el momento** (solo se muestra una vez).
- [ ] Enviárselo a la alumna por un canal de confianza.
- [ ] Confirmar que la alumna aparece luego en `/coach/students`.

> **Recordatorio sobre la primera coach:** la primera coach se promueve manualmente. Tras registrarse, en Supabase se ejecuta:
> ```sql
> update public.profiles
> set role = 'coach', status = 'active', onboarding_completed = true
> where email = 'TU_EMAIL';
> ```

---

## 6. Flujo de revisión de progreso (progress-review)

**Objetivo:** seguir la evolución de la alumna (peso, medidas, fotos) tanto desde el lado de la alumna como desde el de la coach.

### 6.1 Lado de la alumna

1. La alumna abre `/student/progress`.
2. **Registra y consulta su peso** (`weight_entries`).
3. **Registra y consulta sus medidas corporales** (`body_measurements`).
4. **Sube y consulta sus fotos de progreso** (`progress_photos`), que se guardan en el bucket privado `progress-photos`.

### 6.2 Lado de la coach

1. La coach abre la ficha de la alumna en `/coach/students/[studentId]`.
2. Entra a la pestaña de progreso en `/coach/students/[studentId]/progress`.
3. **Revisa la evolución** de peso, medidas y fotos de su alumna.
4. El sistema apoya la lectura con métricas calculadas: cambio de peso, tendencia semanal y cambio de medidas, además de la alerta de **progreso positivo** que aparece en el radar de `/coach`.

### Almacenamiento de fotos

- Bucket `progress-photos`: **privado**.
- Convención de rutas: `<owner_uuid>/<filename>`.
- La alumna lee y escribe **su propia carpeta**; la coach asignada puede leerla.
- Tipos de imagen permitidos: `jpg`, `jpeg`, `png`, `webp`.
- Tamaño máximo sugerido para fotos: ~5 MB (a controlar en el cliente / ajustes del bucket).

```text
weight_entries      -> peso
body_measurements   -> medidas corporales
progress_photos     -> fotos de evolución (bucket progress-photos)
```

---

## Apéndice: rutas de autenticación y públicas

Estas rutas dan soporte a todos los flujos anteriores.

```text
Públicas:  /  /login  /register  /accept-invitation
           /forgot-password  /reset-password  /update-password
           /terms  /privacy  /disclaimer

Auth:      /auth/callback        (intercambio de código OAuth, redirige por rol;
                                  errores -> /auth/auth-code-error)
           /auth/confirm         (verificación de OTP por email)
           /auth/logout          (cerrar sesión)
           /auth/auth-code-error (página de error)

Onboarding:/onboarding
```

> Tras iniciar sesión, el redireccionamiento por rol es automático: `coach`/`admin` → `/coach`, `student` → `/student/today`, perfil incompleto → `/onboarding`, cuenta inactiva → bloqueada.

---

## Buenas prácticas de seguridad que sostienen estos flujos

- **RLS activado** en todas las tablas privadas.
- **Validación de entrada con Zod** y **validación de permisos en el servidor** con los guards `requireAuth`, `requireCoach`, `requireStudent` y `assertCoachOwnsStudent`.
- **Las claves de servicio/secretas nunca llegan al cliente** (solo las variables `NEXT_PUBLIC_*` llegan al navegador).
- **Sin datos sensibles en localStorage.**
- **Sin redirecciones abiertas** en `/auth/callback` (solo rutas relativas).
- **Escalada de rol bloqueada** por trigger de base de datos.
