# Round 2 de mejoras (coach/demo/comidas/visual) — Design

> Aprobado por la dueña el 2026-06-23. Orden: **1 → 2 → 3 → 5 → 4 → 6**, sin gates entre cada una
> salvo decisiones de diseño clave. Cada mejora: mini-diseño → implementación → revisión → deploy.
> Decisiones: comidas = **Open Food Facts**; imágenes = **ilustraciones SVG + íconos** (sin fotos
> externas); rol demo = **badge `is_demo`** (no nuevo rol del enum).

## #1 — Higiene del demo
- **Ocultar las sesiones demo efímeras** (`is_demo = true`, emails `demo+…@demo.evefitmethod.com`) del
  listado "Cuentas registradas" en `/coach/cuentas`. En su lugar una línea discreta: "Sesiones demo
  activas (N) · se borran solas" con un botón opcional "Limpiar ahora" (llama `cleanupExpiredDemos`).
- **Plantilla Valentina** (`demo.alumna@evefitmethod.com`, `is_demo=false`): se queda en el panel,
  con badge **"DEMO · plantilla"** (detectada por email) para que la coach sepa que es de pruebas.
- **Badge DEMO**: donde se muestren cuentas demo, mostrar "DEMO" en vez de "Alumna".
- **Expiración más corta**: `EXPIRY_HOURS` 3 → 2.
- **Tope global**: en `provisionDemoStudent`, antes de crear, contar `is_demo` activas; si ≥ `CAP`
  (p.ej. 50) ejecutar `cleanupExpiredDemos`; si tras eso sigue ≥ CAP, responder "demo no disponible,
  intenta en un momento" (no crear). Bounded.
- Sin cambios de esquema (se reutiliza `is_demo`/`demo_expires_at`).

## #2 — Invitar por WhatsApp
- En el flujo de invitación (`/coach/students/invite`, accesible desde Alumnas), **elegir canal**:
  **Correo** (Resend, ya existe) o **WhatsApp**.
- WhatsApp: tras generar la invitación, abrir `https://wa.me/<numero>?text=<mensaje+link>` (el número
  viene de la solicitud/formulario si existe; si no, permitir ingresarlo). Mensaje precargado con el
  link de invitación, listo para enviar desde el WhatsApp de la coach. (Verificar que la solicitud
  capture teléfono; si no, campo manual.)
- No se envía nada automático por WhatsApp (no hay API de WhatsApp Business); es un `wa.me` deep link.

## #3 — Comidas con Open Food Facts + colores de macros
- **Búsqueda**: al registrar comida, buscar en **Open Food Facts** (`https://world.openfoodfacts.org`
  search API, sin key, idioma es). Mapear a `{name, calories_per_100g, protein/carbs/fat_per_100g}`.
  Mantener alimentos personalizados (`createCustomFood`) y los públicos como complemento.
- Implementar como un endpoint/acción server que consulta OFF (con timeout + fallback a la BD local
  si OFF falla). Resultados con macros por 100g; el resto del flujo (unidades, gramos) ya existe.
- **Colores de macros**: P/C/G con color consistente + leyenda. Proteína, Carbohidratos, Grasa con
  3 colores de marca (p.ej. proteína = info/azul, carbos = warning/ámbar, grasa = primary/escarlata
  o success) y etiqueta clara ("P" → "Proteína" en leyenda/tooltip). Aplicar en `MacroProgress`,
  `FoodLogForm`, listas de comidas, calendario de nutrición, dashboards.

## #5 — Vista de alumno útil (coach/students/[studentId])
- Quitar el **espacio enorme de "Alertas"** (compactarlo a una tarjeta pequeña o badges).
- Panel de **info clave de un vistazo**: peso actual + meta (anillo), adherencia de entrenamiento
  (racha + % últimas semanas), adherencia nutricional (% días), última actividad, próximos a revisar,
  accesos rápidos (plan, nutrición, progreso, calendario), mini-tendencias (peso, sesiones). Reutiliza
  datos de A/B/C (`getStudentProgressDashboard`, calendario, nutrición). Íconos + secciones visuales.

## #4 — Dashboard del coach (rico + animado)
- Reemplazar el dashboard básico por uno informativo:
  - **A quién revisar hoy**: alumnas con comidas pendientes de revisar, sesiones sin registrar, picos
    de peso, baja adherencia (reusa dominio `alerts`).
  - **Stats**: alumnas activas, sesiones registradas esta semana, comidas por revisar, solicitudes
    pendientes.
  - **Actividad reciente**: feed de últimos registros (entrenos/comidas/peso) de sus alumnas.
  - **Mini-gráficos** (SVG): adherencia general, registros por día.
  - Animaciones de entrada escalonadas (reuso `efm-fade-up`, reduced-motion safe). Íconos.

## #6 — Enriquecer visual (íconos + ilustraciones SVG)
- Headers/ilustraciones SVG on-brand para secciones clave (Hoy, Progreso, Nutrición, Entrenamiento,
  Dashboard, vista de alumno). Íconos ricos y consistentes. Menos texto plano, más jerarquía visual.
- Ejercicios: ilustración/placeholder por grupo muscular (SVG) en vez de solo texto.
- Componentes reutilizables `components/common/SectionIllustration` o similar.

## Verificación (todas)
`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`; prueba manual (con el alumno
demo/plantilla); deploy a Vercel. Sin migraciones nuevas salvo que alguna lo requiera (ninguna prevista).

## Fuera de alcance
- API de WhatsApp Business (envío automático). Solo deep link `wa.me`.
- Imágenes foto-realistas generadas por IA dentro de la app.
- Rol nuevo en el enum (`demo`) — se usa `is_demo`.
