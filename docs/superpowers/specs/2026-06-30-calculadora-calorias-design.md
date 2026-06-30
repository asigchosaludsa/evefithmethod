# Calculadora de Calorías Profesional — Spec

**Fecha:** 2026-06-30  
**Estado:** Aprobado por la dueña  
**Prioridad:** Alta — construir después del bot WhatsApp/Telegram (pausado)

---

## Visión

Una calculadora de metabolismo basal y objetivos calóricos para la coach Evelyn. Calcula el TDEE
de una alumna con parámetros profesionales (Mifflin-St Jeor / Katch-McArdle), avalados por papers
de nutrición, y le permite asignar el resultado directamente al plan de nutrición activo de la
alumna — conectando con el calendario de adherencia ya existente.

---

## Ubicación en el producto

- **Ruta:** `/coach/calculadora`
- **Nav coach:** nuevo ítem "Calculadora" (ícono `ti-calculator`) — se añade al menú lateral
- **Acceso:** solo la coach (guard `requireCoach`)

---

## Arquitectura

### 1. Capa de dominio — `/domain/nutrition/energy.ts` + `energy.test.ts`

Matemática pura. Sin DB, sin UI. Testeada con Vitest.

| Función | Descripción |
|---|---|
| `calculateBMR(params)` | Mifflin-St Jeor (default) o Katch-McArdle si hay `bodyfatPct` |
| `calculateTDEE(bmr, activityLevel)` | BMR × factor de actividad (5 niveles) |
| `applyGoalAdjustment(tdee, pct)` | Déficit/superávit porcentual → kcal objetivo + kg/semana |
| `calculateMacros(params)` | Proteína 2.0 g/kg, grasa 0.9 g/kg, carbos = resto |
| `safetyCheck(result)` | Warnings si kcal < 1200 o ritmo > 1% peso/semana |

Cada función expone un campo `source` con la cita del paper para mostrarlo en UI.

### 2. Capa de UI — `/app/(protected)/coach/calculadora/page.tsx`

Wizard de 4 pasos con paneles que se deslizan horizontalmente:

```
[Datos] → [Actividad] → [Objetivo] → [Resultado]
```

- Barra de progreso segmentada en la parte superior
- Cada paso tiene botón "Siguiente / Atrás"
- Los pasos 1–3 son formularios; el paso 4 es solo lectura + botón de asignar

### 3. Capa de servidor — extender `lib/coach/actions.ts`

Nueva función: `assignCalorieTarget(coachId, studentId, targets)`

- Busca el plan de nutrición activo de la alumna
- Si existe → actualiza `calories_target`, `protein_target_g`, `carbs_target_g`, `fat_target_g`
- Si no existe → crea un nuevo `nutrition_plan` con `status: 'active'` y título
  `"Plan calculado — [fecha]"`
- Usa `assertCoachOwnsStudent` + validación Zod

---

## Datos

### Inputs obligatorios

| Campo | Tipo | Rango válido |
|---|---|---|
| Sexo | toggle (mujer/hombre) | — (default: mujer) |
| Edad | número | 14–99 años |
| Peso | número | 30–250 kg |
| Altura | número | 100–220 cm |
| Nivel de actividad | enum (5 opciones) | — |
| Ajuste % | número | −25 a +15 % |

### Input opcional

| Campo | Efecto |
|---|---|
| % grasa corporal | Desbloquea fórmula Katch-McArdle (más exacta en personas atléticas) |

### Pre-llenado desde `student_profiles`

Cuando la coach selecciona una alumna al inicio del wizard, se pre-llenan:
- `current_weight_kg` → peso
- `height_cm` → altura
- `date_of_birth` → edad calculada

Si alguno falta, el campo queda vacío y la coach lo llena manualmente. No rompe el flujo.

### Output → escribe en `nutrition_plans`

`calories_target`, `protein_target_g`, `carbs_target_g`, `fat_target_g`

---

## Fórmulas y fuentes

### TMB (Metabolismo Basal)

**Mifflin-St Jeor (1990)** — fórmula por defecto, más precisa en población general:
- Mujer: `(10 × peso_kg) + (6.25 × altura_cm) − (5 × edad) − 161`
- Hombre: `(10 × peso_kg) + (6.25 × altura_cm) − (5 × edad) + 5`
- Fuente: Mifflin MD et al. *A new predictive equation for resting energy expenditure in
  healthy individuals.* Am J Clin Nutr. 1990;51(2):241-247.

**Katch-McArdle** — si hay % de grasa corporal (más exacta en atletas):
- `TMB = 370 + (21.6 × masa_magra_kg)` donde `masa_magra = peso × (1 − %grasa/100)`
- Fuente: McArdle WD, Katch FI, Katch VL. *Exercise Physiology: Energy, Nutrition, and
  Human Performance.* 5th ed. Lippincott Williams & Wilkins; 2001.

### GET (Gasto Energético Total) = TMB × factor

| Nivel | Factor | Descripción |
|---|---|---|
| Sedentaria | 1.20 | Sin ejercicio o trabajo sentada |
| Ligera | 1.375 | 1–3 días de ejercicio/semana |
| Moderada | 1.55 | 3–5 días de ejercicio/semana |
| Activa | 1.725 | 6–7 días de ejercicio intenso |
| Muy activa | 1.90 | Trabajo físico intenso + entreno diario |

Fuente: Harris JA, Benedict FG. *A biometric study of human basal metabolism.* PNAS. 1918.
Actualizado por: Ainsworth BE et al. *Compendium of Physical Activities.* Med Sci Sports Exerc. 2011.

### Ajuste de objetivo

| Objetivo | Rango recomendado | Ritmo esperado |
|---|---|---|
| Bajar grasa | Déficit 10–20% | −0.5 a −1.0 kg/semana |
| Lean bulk | Superávit 5–15% | +0.2 a +0.4 kg/semana |
| Mantener | 0% | — |

- Piso de seguridad: 1200 kcal/día (mujer), 1500 kcal/día (hombre)
- Alerta si ritmo > 1% del peso corporal/semana (riesgo de pérdida de masa magra)
- Fuente: Academy of Nutrition and Dietetics. *Position of the Academy: Interventions for the
  Treatment of Overweight and Obesity in Adults.* J Acad Nutr Diet. 2022.

### Macros

- **Proteína:** 2.0 g/kg (rango ISSN: 1.6–2.2 g/kg; se usa 2.0 por defecto en déficit/mantenimiento)
- **Grasa:** 0.9 g/kg (rango: 0.8–1.0 g/kg; mínimo hormonal)
- **Carbohidratos:** (kcal_objetivo − proteína_kcal − grasa_kcal) ÷ 4
- Fuente: Stokes T et al. *Recent Perspectives Regarding the Role of Dietary Protein for the
  Promotion of Muscle Hypertrophy.* Nutrients. 2018;10(2):180.

---

## UI y animaciones

El diseño sigue el sistema "Acero & Escarlata" (B3 dark).

### Paso 1 — Datos
- Selector de alumna (dropdown con buscador, o modo "anónimo" sin alumna)
- Toggle segmentado mujer/hombre
- Campos de edad, peso, altura con **ruedas tipo iOS** (scroll táctil en móvil, input numérico en desktop)
- Campo opcional de % grasa con tooltip explicativo

### Paso 2 — Actividad
- 5 opciones en **toggles segmentados con deslizado** (pill que se mueve bajo la selección)
- Cada opción con título corto + descripción de 1 línea

### Paso 3 — Objetivo
- 3 opciones (Bajar grasa / Mantener / Ganar músculo) como toggles
- **Slider de déficit/superávit** que aparece con transición si se elige bajar o ganar
- El slider actualiza en vivo: porcentaje, kcal y "kg/semana estimado"
- Alerta visual si el valor es agresivo (> 20% déficit o > 15% superávit)

### Paso 4 — Resultado
- **Anillo SVG** con count-up animado al entrar al paso
- **Flecha animada** y **badge de objetivo** con colores reactivos:
  - Déficit → rojo `#E24B4A` + `ti-trending-down` (bounce hacia abajo)
  - Mantener → ámbar `#EF9F27` + `ti-minus` (estático)
  - Superávit → teal `#1D9E75` + `ti-trending-up` (bounce hacia arriba)
- Tarjetas TMB y GET
- Barras de macros animadas
- Acordeón **"¿Por qué este número?"** con fórmula, desglose y fuente citada
- Banner de aviso (no bloqueante) si hay alerta de seguridad
- Botón **"Asignar a [nombre]"** (oculto en modo anónimo) → toast de confirmación

### Transición entre pasos
- `translateX` suave (300ms ease-in-out): el paso actual sale a la izquierda, el siguiente entra desde la derecha

---

## Seguridad

- Ruta protegida con `requireCoach`
- `assertCoachOwnsStudent(coachId, studentId)` antes de asignar
- Validación Zod en el servidor con rangos sanos (edad 14–99, peso 30–250, altura 100–220, grasa 5–50)
- La coach puede calcular en modo anónimo (sin alumna) y el botón de asignar no aparece

---

## Tests Vitest — `/domain/nutrition/energy.test.ts`

| Test | Valor esperado |
|---|---|
| `calculateBMR` mujer (62 kg, 165 cm, 28 años) | 1430 kcal |
| `calculateBMR` hombre (80 kg, 178 cm, 30 años) | 1842 kcal |
| `calculateBMR` con Katch-McArdle (62 kg, 25% grasa) | ~1377 kcal |
| `calculateTDEE` (1430 kcal, moderada) | 2217 kcal |
| `applyGoalAdjustment` (2217, −18%) | 1818 kcal, −0.56 kg/sem |
| `calculateMacros` (1818 kcal, 62 kg) | P: 124g, G: 56g, C: ~148g |
| `safetyCheck` (1100 kcal) | warning: bajo_piso |
| `safetyCheck` (1800 kcal, 1.5% ritmo) | warning: ritmo_agresivo |

---

## Migraciones

**Ninguna.** Usa tablas existentes:
- Lee de `student_profiles` (peso, altura, fecha_nacimiento)
- Escribe en `nutrition_plans` (calories_target, protein_target_g, carbs_target_g, fat_target_g)

---

## Alcance MVP

**Incluye:**
- Wizard de 4 pasos con animaciones
- Fórmulas Mifflin-St Jeor y Katch-McArdle con fuentes citadas
- Pre-llenado desde perfil de alumna
- Asignar resultado al plan activo de la alumna
- Avisos de seguridad (no bloqueantes)
- Tests Vitest de toda la capa de dominio

**Excluye (Fase 2):**
- Historial de cálculos por alumna
- Exportar a PDF (usando `lib/pdf` ya existente)
- Cálculo inverso por meta ("quiero bajar 5 kg en 10 semanas")
- Pre-llenar nivel de actividad desde entrenos registrados realmente
- Comparar fórmulas lado a lado (Mifflin vs Harris vs Katch)
