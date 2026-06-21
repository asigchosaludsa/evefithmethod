# Conexión con GitHub — EveFit Method

Esta guía explica, paso a paso, cómo conectar el repositorio local de **EveFit Method** (que ya está inicializado y con commits) al repositorio de GitHub que ya creaste. También define la estrategia de ramas, el uso de Pull Requests antes de producción y las reglas para proteger tus secretos.

> **Importante:** El repositorio ya está inicializado localmente con commits. **No** necesitas ejecutar `git init` de nuevo. Solo falta conectarlo a GitHub y subir el código.

---

## Antes de empezar (requisitos)

- [ ] Tener **Git** instalado en tu computadora.
- [ ] Tener una **cuenta de GitHub** y ya haber **creado el repositorio** en GitHub (esto ya lo hiciste).
- [ ] Tener a mano la **URL del repositorio de GitHub**. La encuentras en la página del repositorio, con el botón verde **Code**:
  - **HTTPS** (recomendado para empezar): `https://github.com/TU_USUARIO/TU_REPO.git`
  - **SSH** (si tienes llaves SSH configuradas): `git@github.com:TU_USUARIO/TU_REPO.git`

> Al crear el repositorio en GitHub, **no** lo inicialices con README, `.gitignore` ni licencia si tu repositorio local ya tiene commits. Un repositorio remoto vacío hace que la conexión sea más sencilla. (Si ya lo creaste con archivos, más abajo se explica cómo resolverlo.)

---

## Conectar el repositorio local con GitHub

Abre una terminal **dentro de la carpeta del proyecto** (la raíz, donde están las carpetas como `supabase/`, `docs/` y el archivo `proxy.ts`). Luego ejecuta estos tres comandos en orden.

### 1. Agregar el remoto `origin`

Esto le dice a tu repositorio local dónde está el repositorio en GitHub. Reemplaza la URL por la de **tu** repositorio.

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
```

Para verificar que quedó bien configurado:

```bash
git remote -v
```

Deberías ver `origin` apuntando a tu URL (en `fetch` y en `push`).

### 2. Renombrar la rama principal a `main`

Esto asegura que tu rama principal se llame `main`, que es el estándar y el nombre que usaremos en producción.

```bash
git branch -M main
```

### 3. Subir el código a GitHub

Este comando sube tus commits y deja configurada la rama `main` local para que siga a la rama `main` remota (gracias a `-u`). Después de esto, podrás usar simplemente `git push` y `git pull`.

```bash
git push -u origin main
```

> Si usas **HTTPS**, GitHub te pedirá iniciar sesión. La contraseña tradicional ya no funciona: debes usar un **Personal Access Token** (Token de acceso personal) que se genera en GitHub, en *Settings → Developer settings → Personal access tokens*.

### Resumen de los tres comandos

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

- [ ] `git remote add origin ...` ejecutado
- [ ] `git branch -M main` ejecutado
- [ ] `git push -u origin main` ejecutado
- [ ] El código aparece en la página de GitHub al recargar

---

## Solución de problemas comunes

**Error: `remote origin already exists`**
Ya existe un remoto llamado `origin`. Puedes ver a dónde apunta con `git remote -v` y, si la URL es incorrecta, actualizarla:

```bash
git remote set-url origin https://github.com/TU_USUARIO/TU_REPO.git
```

**Error al hacer `push`: el remoto tiene cambios que tú no tienes (rejected / non-fast-forward)**
Suele pasar cuando creaste el repositorio en GitHub con un README o `.gitignore`. Trae esos cambios primero y luego vuelve a subir:

```bash
git pull origin main --rebase
git push -u origin main
```

**Te pide usuario y contraseña una y otra vez (HTTPS)**
Asegúrate de estar usando un **Personal Access Token** en lugar de tu contraseña normal de GitHub.

---

## Estrategia de ramas

Trabajaremos con un modelo simple y seguro, ideal para un proyecto manejado por una sola persona o un equipo pequeño:

- **`main`**: la rama principal. **Siempre debe estar estable y lista para producción.** Es la rama que despliega Vercel (la *production branch* es `main`).
- **`feature/*`**: una rama por cada cambio o funcionalidad nueva. Nunca se trabaja directamente sobre `main`.

### Nomenclatura sugerida para ramas

Usa nombres descriptivos en minúsculas y con guiones, por ejemplo:

```text
feature/registro-alumnas
feature/plan-nutricion
feature/correcciones-login
```

### Flujo de trabajo recomendado

1. **Crear una rama** de funcionalidad a partir de `main`:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/nombre-descriptivo
   ```

2. **Trabajar y hacer commits** en esa rama:

   ```bash
   git add .
   git commit -m "Describe el cambio realizado"
   ```

3. **Verificar localmente** antes de subir (calidad del código):

   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

4. **Subir la rama** a GitHub:

   ```bash
   git push -u origin feature/nombre-descriptivo
   ```

5. **Abrir un Pull Request** (ver la siguiente sección).

> Cada vez que subes una rama `feature/*` o abres un PR, **Vercel genera un despliegue de *Preview*** con una URL temporal. Así puedes probar el cambio en un entorno real antes de mezclarlo a producción.

---

## Pull Requests antes de producción

La regla de oro: **nada llega a `main` (producción) sin pasar por un Pull Request (PR).**

Un Pull Request es una solicitud para fusionar tu rama `feature/*` dentro de `main`. Sirve para revisar los cambios antes de que afecten al sitio en vivo.

### Cómo abrir un PR

1. En GitHub, después de subir tu rama, verás un aviso para **"Compare & pull request"**. Haz clic ahí.
2. Asegúrate de que la base sea **`main`** y la rama de comparación sea tu **`feature/...`**.
3. Escribe un **título claro** y una **descripción** de qué cambia y por qué.
4. Crea el PR.

### Checklist antes de fusionar (merge) un PR a `main`

- [ ] `npm run lint` pasa sin errores
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm run test` pasa (recuerda: la lógica de dominio se prueba con Vitest)
- [ ] `npm run build` compila correctamente
- [ ] Revisaste el despliegue de **Preview** que generó Vercel
- [ ] El PR no incluye archivos con secretos (ver sección de seguridad)

Cuando todo esté en orden, usa el botón **"Merge pull request"** en GitHub. Al fusionar a `main`, **Vercel desplegará automáticamente a producción**.

### Mantener tu copia local actualizada

Después de fusionar PRs, vuelve a tu rama `main` local y actualízala:

```bash
git checkout main
git pull origin main
```

---

## Proteger la rama `main` (recomendado para más adelante)

A medida que el proyecto crezca, conviene **proteger** la rama `main` para evitar subir cambios directos por error. Esto se configura en GitHub:

**Settings → Branches → Branch protection rules → Add rule**, con el patrón `main`.

Opciones recomendadas a activar:

- [ ] **Require a pull request before merging** (exigir un PR antes de fusionar) — bloquea los `push` directos a `main`.
- [ ] **Require status checks to pass before merging** (exigir que pasen las verificaciones), por ejemplo lint, typecheck, tests y build, si configuras esas verificaciones automáticas.
- [ ] **Require conversation resolution before merging** (resolver los comentarios del PR antes de fusionar).

> No es obligatorio activarlo desde el primer día, pero sí muy recomendable antes de tener tráfico real, porque obliga a que **todo** pase por la revisión de un PR.

---

## Seguridad: nunca subas secretos

Esta es la sección más importante. **Las llaves secretas jamás deben llegar a GitHub.**

### El `.gitignore` ya protege tus secretos

El repositorio ya incluye un `.gitignore` configurado, que evita subir los archivos de variables de entorno locales (como `.env.local`) y otros archivos que no deben versionarse. **No lo edites para "destapar" esos archivos.**

### Qué NUNCA se sube al repositorio

- **`.env.local`** ni ningún archivo de variables de entorno con valores reales.
- **`SUPABASE_SECRET_KEY`** (solo servidor).
- **`SUPABASE_SERVICE_ROLE_KEY`** (solo servidor; **omite RLS** y se usa únicamente para aceptar invitaciones). Esta llave es especialmente sensible.
- Cualquier llave de servicios futuros si llegas a usarlos (por ejemplo `RESEND_API_KEY`, `POSTMARK_API_KEY`, `SENTRY_DSN`, `STRIPE_SECRET_KEY`).

> Regla práctica: solo las variables que empiezan con **`NEXT_PUBLIC_`** llegan al navegador. Todo lo demás (las llaves de servidor de arriba) debe permanecer **fuera** del código y fuera de Git.

### Qué SÍ se sube

- El archivo **`.env.example`**, que solo contiene los **nombres** de las variables (sin valores reales). Sirve como plantilla para saber qué variables hay que configurar.

Las variables del proyecto, según `.env.example`, son:

```bash
# Públicas (llegan al navegador)
NEXT_PUBLIC_SITE_URL=https://app.evefitmethod.com
NEXT_PUBLIC_MARKETING_URL=https://evefitmethod.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # (o la antigua NEXT_PUBLIC_SUPABASE_ANON_KEY — la app acepta cualquiera)

# Solo servidor (NUNCA en el cliente, NUNCA en Git)
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # omite RLS; solo para aceptar invitaciones
```

> Las llaves reales se configuran como **variables de entorno en Vercel** (en los entornos Production, Preview y Development) y en el **panel de Supabase**, **no** en el repositorio.

### ¿Y si subiste un secreto por error?

Si en algún momento un archivo con secretos llega a GitHub:

1. **Rota (regenera) la llave de inmediato** en Supabase o en el servicio correspondiente. Una llave expuesta debe considerarse comprometida.
2. Asegúrate de que el archivo esté listado en `.gitignore`.
3. Deja de versionar el archivo (sin borrarlo de tu disco):

   ```bash
   git rm --cached .env.local
   git commit -m "Deja de versionar el archivo de entorno local"
   git push
   ```

   > Esto evita que vuelva a subirse, pero **no borra el secreto del historial**. Por eso el paso 1 (rotar la llave) es obligatorio.

- [ ] `.env.local` y las llaves de servidor **nunca** se suben
- [ ] Las llaves reales viven en Vercel y Supabase, no en Git
- [ ] Solo `.env.example` (con nombres, sin valores) se versiona
- [ ] Si se filtró un secreto, se **rota** de inmediato

---

## Próximos pasos

Una vez que el código está en GitHub, el siguiente paso es el despliegue:

1. En **Vercel**, importar este repositorio de GitHub.
2. Framework: **Next.js**. Comando de build: `npm run build`. Comando de instalación: `npm install`.
3. Agregar las variables de entorno (Production + Preview + Development).
4. Rama de producción: **`main`**.

A partir de ahí, cada PR fusionado a `main` se desplegará automáticamente a producción, y cada rama `feature/*` generará un Preview para probar antes de fusionar.
