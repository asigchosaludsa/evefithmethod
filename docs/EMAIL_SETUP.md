# Configuración de Email — EveFit Method

Esta guía explica cómo funcionan los correos transaccionales de EveFit Method, cómo pasar del modo de desarrollo a producción con un SMTP propio, qué registros DNS necesitas (SPF, DKIM y DMARC), cómo personalizar las plantillas, cómo probar cada flujo y qué URLs deben estar autorizadas. Está escrita para la dueña del proyecto, paso a paso.

> EveFit Method usa **Supabase Auth** para enviar todos los correos relacionados con cuentas (confirmación, recuperación de contraseña, invitación y bienvenida). No hay ningún servidor de correo propio dentro de la aplicación.

---

## 1. Desarrollo vs. Producción

El comportamiento del correo cambia según el entorno:

| Aspecto | Desarrollo (local) | Producción |
| --- | --- | --- |
| Origen de los correos | Servidor de correo **por defecto de Supabase** | **SMTP propio** configurado en Supabase Auth |
| Remitente (`From`) | Dirección genérica de Supabase | Tu dominio, p. ej. `no-reply@evefitmethod.com` |
| Límite de envíos | Muy limitado (solo para pruebas) | El de tu proveedor SMTP |
| Entregabilidad (no caer en spam) | Baja | Alta, si configuras SPF/DKIM/DMARC |
| URL del sitio | `http://localhost:3000` | `https://app.evefitmethod.com` |

**Resumen práctico:**

- En **desarrollo** no tienes que configurar nada de correo: Supabase envía los emails con su servidor por defecto. Sirve solo para probar los flujos en `http://localhost:3000`.
- En **producción** el servidor por defecto de Supabase **no es suficiente** (límites bajos y riesgo de spam). Debes configurar un **SMTP personalizado** y los **registros DNS** del dominio. Esto está marcado como pendiente previo a producción en el proyecto.

Los correos transaccionales de EveFit Method son cuatro:

1. **Confirmación de email** (al registrarse).
2. **Recuperación de contraseña** (reset password).
3. **Invitación** (la coach invita a una alumna).
4. **Bienvenida** (welcome).

---

## 2. Configurar SMTP personalizado en Supabase

El SMTP personalizado se configura en el **panel de Supabase**, dentro de los ajustes de **Auth**. No requiere tocar código de la aplicación.

### Pasos

1. Entra al panel de Supabase de tu proyecto.
2. Ve a **Authentication** → ajustes de **SMTP** (Custom SMTP).
3. Activa el SMTP personalizado e introduce los datos que te dará tu proveedor de correo:
   - **Host** del servidor SMTP.
   - **Puerto** SMTP.
   - **Usuario** y **contraseña** SMTP.
   - **Remitente (sender)**, por ejemplo `no-reply@evefitmethod.com`.
   - **Nombre del remitente**, por ejemplo `EveFit Method`.
4. Guarda los cambios.

> El remitente recomendado es `no-reply@evefitmethod.com`, usando el dominio `evefitmethod.com`. Para que los correos enviados desde esa dirección lleguen bien a la bandeja de entrada, **el dominio debe tener los registros DNS** descritos en la siguiente sección.

### Lista de verificación de SMTP

- [ ] SMTP personalizado activado en Supabase Auth.
- [ ] Host, puerto, usuario y contraseña introducidos.
- [ ] Remitente = `no-reply@evefitmethod.com` (o la dirección que decidas en `evefitmethod.com`).
- [ ] Nombre del remitente legible (`EveFit Method`).
- [ ] DNS del dominio configurado (ver sección 3).
- [ ] Envío de prueba realizado (ver sección 5).

---

## 3. Registros DNS necesarios: SPF, DKIM y DMARC

Estos tres registros se añaden en la **zona DNS de tu dominio** (`evefitmethod.com`), en el panel del registrador o de quien gestione el DNS. Sirven para que los servidores de correo (Gmail, Outlook, etc.) confíen en los emails que salen de tu dominio y no los marquen como spam.

> **Importante:** los valores exactos de estos registros te los proporciona **tu proveedor de email/SMTP**. Los ejemplos de abajo muestran la *forma* de cada registro; debes pedir y usar los valores reales que te indique el proveedor.

### 3.1 SPF (Sender Policy Framework)

**Qué es:** declara qué servidores tienen permiso para enviar correo en nombre de tu dominio. Es un registro **TXT** en el dominio raíz.

**Ejemplo de forma del registro (pide el valor real al proveedor):**

```dns
Tipo:   TXT
Nombre: @            (el dominio raíz, evefitmethod.com)
Valor:  v=spf1 include:<dominio-de-envio-del-proveedor> ~all
```

- Solo debe existir **un** registro SPF por dominio. Si ya tienes uno, no crees otro: combina los `include:` en una sola línea.

### 3.2 DKIM (DomainKeys Identified Mail)

**Qué es:** firma criptográficamente cada correo para demostrar que no fue alterado y que realmente salió de tu dominio. Suele ser uno o varios registros **TXT** (a veces CNAME) bajo un subdominio llamado *selector*.

**Ejemplo de forma del registro (pide el valor real al proveedor):**

```dns
Tipo:   TXT
Nombre: <selector>._domainkey      (el proveedor te da el selector exacto)
Valor:  v=DKIM1; k=rsa; p=<clave-publica-que-te-da-el-proveedor>
```

- El **selector** y la **clave pública** los genera el proveedor de correo. Cópialos tal cual.

### 3.3 DMARC (Domain-based Message Authentication, Reporting & Conformance)

**Qué es:** define qué deben hacer los servidores receptores cuando un correo no pasa SPF o DKIM, y a dónde enviar los informes. Es un registro **TXT** bajo `_dmarc`.

**Ejemplo de forma del registro:**

```dns
Tipo:   TXT
Nombre: _dmarc
Valor:  v=DMARC1; p=none; rua=mailto:dmarc@evefitmethod.com
```

- Empieza con la política **`p=none`** (solo observa y recibe informes) para no bloquear correos legítimos mientras verificas que SPF y DKIM funcionan.
- Cuando confirmes que todo está bien, puedes endurecerla a `p=quarantine` y luego a `p=reject`.

### Lista de verificación de DNS

- [ ] SPF (TXT) creado en el dominio raíz con el `include:` del proveedor.
- [ ] DKIM (TXT/CNAME) creado con el selector y la clave pública del proveedor.
- [ ] DMARC (TXT en `_dmarc`) creado, empezando por `p=none`.
- [ ] Verificado el estado de los registros en el panel del proveedor de email.
- [ ] (Opcional) Después de validar, endurecer DMARC a `quarantine`/`reject`.

---

## 4. Personalizar las plantillas de correo

Las plantillas de los correos transaccionales se editan en el **panel de Supabase**, en **Authentication** → **Email Templates**. Cada flujo tiene su propia plantilla:

- **Confirmación de email** (confirm): se envía al registrarse para verificar la dirección.
- **Recuperación de contraseña** (reset): enlace para restablecer la contraseña.
- **Invitación** (invite): correo que recibe la persona invitada.
- **Bienvenida** (welcome): mensaje de bienvenida.

### Recomendaciones al personalizar

- Mantén el tono y la identidad visual de la marca **"Acero & Escarlata"** (escarlata `#FF3B47`, acero oscuro y blanco).
- Usa un remitente y nombre coherentes (`EveFit Method`, `no-reply@evefitmethod.com`).
- Conserva los enlaces y variables que Supabase inserta automáticamente (el enlace de confirmación/recuperación). No los borres ni los modifiques manualmente, o el flujo dejará de funcionar.
- Asegúrate de que los enlaces apunten al dominio de producción (`https://app.evefitmethod.com`), lo cual depende del **Site URL** y las **Redirect URLs** correctamente configuradas (ver sección 6).
- Incluye un texto claro de quién envía el correo y qué debe hacer la persona.

> **Sobre la invitación de alumnas:** en EveFit Method las alumnas son **solo por invitación**. La coach crea una invitación y la aplicación genera un enlace que se muestra **una sola vez** con el formato `/accept-invitation?token=...`. Internamente solo se guarda un `token_hash` (SHA-256), nunca el enlace en crudo. Si decides usar la plantilla de invitación de Supabase, ten presente que el flujo principal de invitación de la app se basa en ese enlace `/accept-invitation`.

### Disclaimer de salud (texto exacto)

Si quieres añadir un aviso legal en los correos o en pies de página, usa este texto literal del proyecto:

> EveFit Method ofrece herramientas de seguimiento fitness y nutricional. No reemplaza consejo médico, diagnóstico ni tratamiento profesional. Consulta con un profesional de salud antes de iniciar cambios importantes en alimentación o entrenamiento.

---

## 5. Cómo probar confirmación, recuperación e invitación

Puedes probar en local (`http://localhost:3000`) con el correo por defecto de Supabase, o en producción una vez configurado el SMTP. Arranca el entorno local con:

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

### 5.1 Probar la confirmación de email (registro)

1. Ve a `/register` y crea una cuenta con un correo real al que tengas acceso.
2. Revisa la bandeja de entrada: debe llegar el correo de **confirmación**.
3. Al hacer clic en el enlace, se verifica el OTP de email y la app procesa la confirmación en la ruta `/auth/confirm`.
4. Tras confirmar, el inicio de sesión redirige según el rol/estado:
   - Perfil incompleto → `/onboarding`
   - Alumna → `/student/today`
   - Coach/admin → `/coach`
   - Usuario inactivo → bloqueado

> Recuerda: el primer coach se promueve **manualmente** en Supabase. Tras registrarte y confirmar, ejecuta en el editor SQL de Supabase:
>
> ```sql
> update public.profiles set role='coach', status='active', onboarding_completed=true where email='YOUR_EMAIL';
> ```

### 5.2 Probar la recuperación de contraseña (reset)

1. Ve a `/forgot-password` e introduce el correo de una cuenta existente.
2. Revisa la bandeja: debe llegar el correo de **recuperación de contraseña**.
3. El enlace lleva al flujo de restablecimiento (`/reset-password` y la actualización en `/update-password`).
4. Define la nueva contraseña y verifica que puedes iniciar sesión en `/login`.

### 5.3 Probar la invitación de una alumna

1. Inicia sesión como **coach** y entra en `/coach/students/invite`.
2. Crea una invitación para la alumna.
3. La app muestra **una sola vez** el enlace con el formato `/accept-invitation?token=...`. Cópialo (en producción se lo harás llegar a la alumna).
4. Abre ese enlace en `/accept-invitation`, completa el registro/aceptación y comprueba que la alumna queda vinculada a la coach.

> Una persona que se registra por su cuenta **sin invitación** queda como alumna **sin coach** hasta que se la vincule.

### Lista de verificación de pruebas

- [ ] Llega y funciona el correo de **confirmación** (`/register` → `/auth/confirm`).
- [ ] Llega y funciona el correo de **recuperación** (`/forgot-password` → `/reset-password` → `/update-password`).
- [ ] Funciona el flujo de **invitación** (`/coach/students/invite` → `/accept-invitation?token=...`).
- [ ] En producción, los correos llegan a la **bandeja de entrada** (no a spam).

---

## 6. URLs que deben estar autorizadas en Supabase

Para que los enlaces de los correos (y los inicios de sesión con OAuth) funcionen, hay que configurar el **Site URL** y las **Redirect URLs** en **Authentication** del panel de Supabase. Si una URL no está autorizada, el enlace del correo fallará o redirigirá a `/auth/auth-code-error`.

**Site URL (producción):**

```
https://app.evefitmethod.com
```

**Redirect URLs (añadir TODAS):**

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

**Proveedores a habilitar en Supabase:** Email (con confirmaciones activadas), Google, Facebook y Apple.

> Tras desplegar en Vercel y tener el dominio real, **actualiza el Site URL y las Redirect URLs** de Supabase para que coincidan con el dominio de producción, y vuelve a probar el inicio de sesión.

### Lista de verificación de URLs

- [ ] **Site URL** = `https://app.evefitmethod.com`.
- [ ] Todas las **Redirect URLs** de la lista anterior añadidas.
- [ ] Proveedor **Email** habilitado con confirmaciones activas.
- [ ] Redirect URLs actualizadas tras el despliegue en el dominio real.

---

## 7. Consejos básicos anti-spam

Para que los correos transaccionales lleguen a la bandeja de entrada y no a la carpeta de spam:

- **Configura SPF, DKIM y DMARC** (sección 3). Es lo que más impacto tiene en la entregabilidad.
- Usa un **remitente coherente y reconocible** (`no-reply@evefitmethod.com`) con un nombre claro (`EveFit Method`). No cambies de dirección con frecuencia.
- Asegúrate de que el **dominio del remitente coincide** con el dominio que tiene los registros DNS (`evefitmethod.com`).
- Mantén las plantillas con un **equilibrio razonable de texto e imágenes** y enlaces legítimos hacia tus dominios oficiales.
- Empieza DMARC con `p=none`, observa los informes y solo después endurece la política.
- Evita enviar masivamente desde la dirección transaccional; mantenla solo para correos de cuenta (confirmación, recuperación, invitación, bienvenida).
- Comprueba que los enlaces de los correos apuntan a URLs **autorizadas** (sección 6); enlaces rotos o a dominios no verificados perjudican la reputación.

---

## 8. Proveedores de email (documentados, no implementados)

El proyecto contempla a futuro la integración con proveedores de correo transaccional como **Resend** y **Postmark**, pero **todavía no están implementados** en la aplicación. Las variables de entorno correspondientes están reservadas como futuras y **no se usan actualmente**:

- `RESEND_API_KEY` — *futura, no implementada*
- `POSTMARK_API_KEY` — *futura, no implementada*

> Mientras no se implementen, el envío de correos se hace **íntegramente a través del SMTP personalizado de Supabase Auth** descrito en la sección 2. No configures Resend ni Postmark en la app esperando que envíen correos: no hay código que los utilice.

---

## Resumen rápido

1. **Desarrollo:** no toques nada; Supabase envía correos por defecto en `http://localhost:3000`.
2. **Producción:** configura **SMTP personalizado** en Supabase Auth (remitente `no-reply@evefitmethod.com`).
3. Añade **SPF, DKIM y DMARC** en el DNS de `evefitmethod.com` con los valores que te dé el proveedor.
4. Personaliza las plantillas (confirm, reset, invite, welcome) en **Email Templates** de Supabase.
5. Configura el **Site URL** y todas las **Redirect URLs**.
6. Prueba confirmación, recuperación e invitación.
7. Resend/Postmark son **futuros**: hoy todo el correo sale por el SMTP de Supabase.
