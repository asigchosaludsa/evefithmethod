# Configuración de dominio — EveFit Method

Esta guía explica, paso a paso, cómo conectar tu dominio **evefitmethod.com** a tu proyecto ya desplegado en Vercel. Está pensada para que la sigas tú misma, sin conocimientos técnicos previos.

Hay dos caminos para conseguir el dominio:

- **Opción A — Comprar el dominio dentro de Vercel** (más sencillo, todo en un solo lugar).
- **Opción B — Comprar el dominio en un proveedor externo** (por ejemplo Namecheap, GoDaddy, etc.) y luego conectarlo a Vercel.

Elige **una** de las dos opciones. Después, ambas comparten los mismos pasos finales de configuración de subdominios, Supabase y prueba de inicio de sesión.

---

## Estructura de subdominios recomendada

EveFit Method es una sola aplicación Next.js que, por ahora, sirve todo. La organización de dominios planificada es:

| Dominio | Uso | Recomendación |
| --- | --- | --- |
| `app.evefitmethod.com` | La aplicación privada (login, panel de coach, panel de alumnas) | **Este es el dominio principal de la app.** |
| `evefitmethod.com` | Página de aterrizaje / marketing (landing) | Dominio raíz (apex) — landing o redirección. |
| `www.evefitmethod.com` | Alias de la web | Apunta a lo mismo que el dominio raíz. |

**Resumen de la recomendación:**

- `app.evefitmethod.com` → **la aplicación**.
- `evefitmethod.com` → **landing / redirección**.
- `www.evefitmethod.com` → **alias** del dominio raíz.

> Estos valores ya están reflejados en las variables de entorno del proyecto:
>
> ```bash
> NEXT_PUBLIC_SITE_URL=https://app.evefitmethod.com
> NEXT_PUBLIC_MARKETING_URL=https://evefitmethod.com
> ```

---

## Antes de empezar (requisitos)

- [ ] El repositorio de GitHub ya está creado y el proyecto está **importado y desplegado en Vercel** (framework Next.js, build `npm run build`, install `npm install`, rama de producción `main`).
- [ ] Las variables de entorno ya están añadidas en Vercel (Production + Preview + Development).
- [ ] Tienes acceso al **panel de Vercel** del proyecto.
- [ ] Tienes acceso al **panel de Supabase** del proyecto (para los pasos finales).

---

## Opción A — Comprar el dominio en Vercel

Es la vía más directa: compras el dominio y se conecta automáticamente, sin tener que tocar registros DNS manualmente.

### A.1 Buscar y comprar el dominio

1. Entra en el panel de **Vercel** y abre tu proyecto de EveFit Method.
2. Ve a la pestaña **Domains** (Dominios) del proyecto.
3. En el buscador, escribe **`evefitmethod.com`** y pulsa buscar.
4. Si aparece como disponible, selecciónalo y completa la **compra** dentro de Vercel (Vercel actúa como registrador del dominio).

### A.2 Adjuntar el dominio al proyecto

1. Una vez comprado, Vercel adjunta automáticamente **`evefitmethod.com`** a este proyecto.
2. Verifica que el dominio aparece listado en la pestaña **Domains** del proyecto.

### A.3 Añadir los subdominios `app.` y `www.`

En la misma pestaña **Domains** del proyecto, añade los subdominios:

1. Añade **`app.evefitmethod.com`**.
2. Añade **`www.evefitmethod.com`**.

Como el dominio se compró en Vercel, los registros DNS necesarios se configuran de forma **automática**; no necesitas crear registros a mano.

### A.4 Confirmar el certificado SSL (HTTPS)

1. Tras unos minutos, Vercel emite automáticamente el **certificado SSL** para cada dominio y subdominio.
2. En la pestaña **Domains**, comprueba que `evefitmethod.com`, `app.evefitmethod.com` y `www.evefitmethod.com` aparecen como **válidos / con SSL activo**.
3. Abre cada uno en el navegador y confirma que cargan con **`https://`** (candado).

> Cuando los tres dominios estén verificados y con SSL, continúa en la sección **[Configuración común para ambas opciones](#configuración-común-para-ambas-opciones)**.

---

## Opción B — Comprar el dominio en un proveedor externo

Usa esta vía si compras (o ya tienes) el dominio en un registrador externo (Namecheap, GoDaddy, Google Domains, etc.). En este caso, configurarás los registros DNS que Vercel te indique.

### B.1 Añadir el dominio en Vercel

1. Compra el dominio **`evefitmethod.com`** en tu proveedor externo (si aún no lo tienes).
2. En el panel de **Vercel**, abre tu proyecto y ve a la pestaña **Domains**.
3. Escribe **`evefitmethod.com`** y pulsa **Add** (Añadir).
4. Repite para añadir **`www.evefitmethod.com`** y **`app.evefitmethod.com`**.

Vercel te mostrará los **registros DNS** que debes crear en tu proveedor externo.

### B.2 Configurar los registros DNS que Vercel indica

Entra al panel de DNS de tu proveedor externo y crea exactamente los registros que Vercel te muestra. La configuración típica es:

| Subdominio / host | Tipo de registro | Valor |
| --- | --- | --- |
| `evefitmethod.com` (raíz / apex) | **A** o **ALIAS** | El valor exacto que Vercel muestra para el apex |
| `www` | **CNAME** | `cname.vercel-dns.com` |
| `app` | **CNAME** | `cname.vercel-dns.com` |

**Notas importantes:**

- Para el **dominio raíz (apex)**, usa el registro **A** (o **ALIAS**, según lo que ofrezca tu proveedor) con el valor exacto que aparece en Vercel.
- Para **`www`** y **`app`**, usa registros **CNAME** apuntando a **`cname.vercel-dns.com`**.
- Copia los valores **exactamente** como los muestra Vercel; no inventes ni modifiques valores.

### B.3 Esperar la propagación DNS

1. Guarda los registros en tu proveedor.
2. La **propagación DNS** puede tardar desde unos minutos hasta varias horas.
3. En la pestaña **Domains** de Vercel, los dominios pasarán de "pendiente / no configurado" a **verificado** cuando los registros se detecten correctamente.

### B.4 Confirmar el certificado SSL (HTTPS)

1. Cuando Vercel detecta los registros DNS correctos, emite automáticamente el **certificado SSL**.
2. Comprueba en **Domains** que `evefitmethod.com`, `app.evefitmethod.com` y `www.evefitmethod.com` aparecen como **válidos / con SSL activo**.
3. Abre cada uno en el navegador y confirma que cargan con **`https://`**.

> Cuando los tres dominios estén verificados y con SSL, continúa en la sección siguiente.

---

## Configuración común para ambas opciones

Una vez que los dominios estén conectados y con SSL activo (por la Opción A o la B), completa estos pasos.

### 1. Definir el rol de cada dominio

- **`app.evefitmethod.com`** → es **la aplicación** (donde viven el login y los paneles).
- **`evefitmethod.com`** → es la **landing / redirección** (página de marketing o redirección).
- **`www.evefitmethod.com`** → **alias** del dominio raíz.

Esto coincide con las variables de entorno ya configuradas en Vercel:

```bash
NEXT_PUBLIC_SITE_URL=https://app.evefitmethod.com
NEXT_PUBLIC_MARKETING_URL=https://evefitmethod.com
```

Asegúrate de que estas variables tengan estos valores en Vercel (en Production).

### 2. Actualizar la configuración de Auth en Supabase

Entra al panel de **Supabase** del proyecto y ve a **Authentication** (Autenticación).

#### 2.1 Site URL

Establece el **Site URL** en:

```text
https://app.evefitmethod.com
```

#### 2.2 Redirect URLs

Añade **todas** estas URLs en la lista de **Redirect URLs**:

```text
http://localhost:3000/**
http://localhost:3000/auth/callback
https://app.evefitmethod.com/**
https://app.evefitmethod.com/auth/callback
https://evefitmethod.com/**
https://evefitmethod.com/auth/callback
https://www.evefitmethod.com/**
https://www.evefitmethod.com/auth/callback
```

Lista de verificación:

- [ ] **Site URL** = `https://app.evefitmethod.com`
- [ ] Redirect URLs de `localhost` añadidas (para desarrollo).
- [ ] Redirect URLs de `app.evefitmethod.com` añadidas.
- [ ] Redirect URLs de `evefitmethod.com` añadidas.
- [ ] Redirect URLs de `www.evefitmethod.com` añadidas.
- [ ] Guardados los cambios en Supabase.

> Estas Redirect URLs son necesarias porque las rutas de autenticación (`/auth/callback`, `/auth/confirm`) usan estos dominios para completar el inicio de sesión por email y los proveedores OAuth (Google, Facebook, Apple).

### 3. Probar el inicio de sesión en producción

Después de actualizar Supabase, comprueba que todo funciona en el dominio real:

1. Abre **`https://app.evefitmethod.com/login`** en el navegador.
2. Inicia sesión con un usuario real.
3. Verifica que la redirección por rol funciona:
   - **Coach / admin** → `/coach`
   - **Alumna (student)** → `/student/today`
   - **Perfil incompleto** → `/onboarding`
   - **Usuario inactivo** → bloqueado
4. Si usas proveedores OAuth (Google, Facebook, Apple), prueba al menos uno y confirma que vuelve correctamente a la app tras autenticarte.
5. Comprueba que **`https://evefitmethod.com`** y **`https://www.evefitmethod.com`** también cargan correctamente con HTTPS.

Lista de verificación final:

- [ ] Login con email funciona en `app.evefitmethod.com`.
- [ ] La redirección por rol lleva al panel correcto.
- [ ] OAuth (si está habilitado) vuelve correctamente a la app.
- [ ] `evefitmethod.com` y `www.evefitmethod.com` cargan con `https://`.
- [ ] Los tres dominios muestran SSL válido (candado en el navegador).

---

## Resumen rápido

```text
Opción A (Vercel): buscar evefitmethod.com → comprar → adjuntar al proyecto
                   → añadir app. y www. → confirmar SSL

Opción B (externo): añadir dominio en Vercel → crear registros DNS
                    (A/ALIAS para el apex, CNAME a cname.vercel-dns.com
                     para www y app) → esperar propagación → confirmar SSL

Ambas:  app.evefitmethod.com = la app
        evefitmethod.com     = landing / redirección
        www.evefitmethod.com = alias
        → actualizar Site URL + Redirect URLs en Supabase
        → probar login en producción
```
