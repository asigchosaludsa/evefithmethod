# Bot de chat (WhatsApp / Telegram) — IDEA PENDIENTE (brainstorming en pausa)

> **Estado:** PENDIENTE. Brainstorming iniciado el 2026-06-30, pausado por decisión de la dueña
> para priorizar la **calculadora de calorías profesional** (ver spec aparte). No perder este hilo:
> retomar después de la calculadora.

## Visión (en palabras de la dueña)

Un chatbot de IA por **WhatsApp o Telegram** con dos capacidades:

- **(A) Consultar:** la alumna le escribe y pregunta cosas como:
  - "¿Cuál es mi rutina de hoy?"
  - "¿Cuántas calorías debo comer hoy?"
  - "¿Qué podría comer hoy para alcanzar mis calorías diarias?"
  - "¿Qué ejercicios me faltan?"
  - "¿Cómo hago tal ejercicio?"
- **(B) Registrar:** la alumna (y la coach) puede **registrar comidas y ejercicios desde el chat**,
  con validación, y eso se **sincroniza con la web**. Es decir, dos formas de usar la plataforma:
  la web y el chat.

## Decisiones / análisis hasta ahora

### Audiencia y escala
- **Coach + todas las alumnas** (no solo piloto). Volumen inicial: ~10 alumnas/mes.

### Canal: se inclina por **WhatsApp** (adopción), Telegram como alternativa gratis para validar
- **Telegram:** gratis e ilimitado, setup en horas, **pero** no da el teléfono automáticamente
  (requiere botón "compartir contacto") y la mayoría en Latinoamérica no lo tiene instalado.
- **WhatsApp (Cloud API de Meta):** lo que las alumnas ya usan + da el **teléfono verificado
  automáticamente**. **Pero** requiere verificar un Meta Business, número dedicado y aprobar
  plantillas. Setup en días.

### Costo estimado (~10 alumnas/mes)
- Mensajes que el bot **responde** (la alumna escribe primero, respuesta dentro de 24h) =
  **conversaciones de servicio = GRATIS e ilimitadas** en WhatsApp.
- Mensajes que el bot **inicia** (recordatorios proactivos fuera de 24h) = plantilla de utilidad,
  unos **centavos por mensaje**.
- IA: **$0** con capa gratis (Gemini Flash / Groq) o **~$3–5/mes** peor caso con Claude Haiku.
- Hosting: **$0** (ya está en Vercel; el webhook es una función serverless).
- **TOTAL realista: $0–5/mes.**

### ⚠️ Gotcha del número de WhatsApp
- Conectar un número a la **Cloud API** lo vuelve "solo API": **deja de funcionar en la app normal
  de WhatsApp**. NO usar el número personal. Usar un **número dedicado** (SIM aparte) o el
  **número de prueba gratis** de Meta (máx. 5 destinatarios) para validar sin gastar.

### Vinculación segura (chat ↔ cuenta web)
- **No confiar en un número tecleado.** Confiar en el número que la plataforma verifica.
- WhatsApp da el teléfono verificado → matching nativo y seguro.
- Telegram no → requiere "compartir contacto" o un código.
- **Patrón robusto (sirve para ambos):** como el modelo ya es invite-only, colgar la vinculación
  del flujo de invitación con un **código de un solo uso**. La alumna abre el bot, pega el código
  → queda atada provablemente a su cuenta web. El teléfono se guarda como etiqueta legible.
- Sugerencia: **añadir el teléfono al formulario de solicitud/onboarding** (lo pidió la dueña).

### Arquitectura (esbozo, reutiliza lo existente)
- El bot **no reinventa nada**: reutiliza `/domain` (nutrición, workouts, alerts) y Supabase.
- Consultas tipo "rutina de hoy" / "calorías" → **consulta directa a Supabase, sin IA** (gratis y exacta).
- Consultas tipo "cómo hago X" / "qué puedo comer" → **sí usan IA** (lenguaje natural / sugerencias).
- Webhook del bot en Vercel (función serverless). Validar permisos server-side (RLS no aplica al bot).

## Ideas que extienden la visión (para retomar)
- Recordatorios proactivos: "no registraste el almuerzo 👀" (usa las alertas ya en `/domain`).
- Notificaciones a la coach: "Camila lleva 3 días sin entrenar".
- Foto → comida: la alumna manda foto del plato, la IA estima macros (fase avanzada).
- Check-in semanal por chat en vez de abrir la web.

## Preguntas abiertas (pendientes de responder al retomar)
- [ ] Confirmar canal definitivo: ¿WhatsApp, Telegram, o diseñar para ambos?
- [ ] ¿Conseguir número dedicado o empezar con número de prueba de Meta?
- [ ] v1 del bot: ¿solo consultas (lectura), o también registro (escritura) desde el día uno?
- [ ] ¿Qué proveedor de IA fijamos (Gemini Flash gratis vs Haiku de pago)?
