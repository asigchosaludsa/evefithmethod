#!/usr/bin/env node
/**
 * seed-demo-student.mjs
 *
 * Crea (o re-crea, idempotente) una ALUMNA DE DEMO rica para EveFit Method, con
 * ~1 mes de historial: plan de entrenamiento PPL+UL, logs con sobrecarga
 * progresiva, peso corporal, medidas, plan de nutrición y comidas, y tips.
 *
 * NO contiene secretos. Lee en tiempo de ejecución:
 *   - .env.local           -> NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *                             (o SUPABASE_SECRET_KEY), OWNER_EMAIL
 *   - OPERATIONS.local.md  -> token de Management API (sbp_...) + project ref
 *
 * Uso:  node scripts/seed-demo-student.mjs
 *
 * Re-ejecutable: si la alumna demo ya existe, borra sus datos hijos y re-siembra.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Carga de credenciales (runtime, nunca hardcoded)
// ---------------------------------------------------------------------------
function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = parseEnv(path.join(ROOT, '.env.local'));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
const OWNER_EMAIL = env.OWNER_EMAIL;

const opsText = fs.existsSync(path.join(ROOT, 'OPERATIONS.local.md'))
  ? fs.readFileSync(path.join(ROOT, 'OPERATIONS.local.md'), 'utf8')
  : '';
const SBP = (opsText.match(/sbp_[A-Za-z0-9]+/) || [])[0];
const PROJECT_REF = (opsText.match(/bhlkfmulpvybzfxumbyp/) || ['bhlkfmulpvybzfxumbyp'])[0];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FALTAN credenciales en .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY).');
  process.exit(1);
}
if (!SBP) {
  console.error('FALTA token de Management API (sbp_...) en OPERATIONS.local.md.');
  process.exit(1);
}

const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function sql(query) {
  const r = await fetch(MGMT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`Management SQL ${r.status}: ${text}\n--- query ---\n${query.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : [];
}

function q(v) {
  // Quote a SQL literal safely (string/number/null).
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ISO date helpers (UTC, YYYY-MM-DD), mirroring domain/workouts/calendar.ts
function pad(n) { return String(n).padStart(2, '0'); }
function parseUTC(iso) { const [y, mo, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, mo - 1, d)); }
function fmt(d) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
function addDaysISO(iso, n) { const d = parseUTC(iso); d.setUTCDate(d.getUTCDate() + n); return fmt(d); }
function weekdayOf(iso) { const dow = parseUTC(iso).getUTCDay(); return dow === 0 ? 7 : dow; }

const DEMO_EMAIL = 'demo.alumna@evefitmethod.com';
const DEMO_PASSWORD = 'DemoAlumna2026!';

// ---------------------------------------------------------------------------
// 1. Auth user (create or reuse)
// ---------------------------------------------------------------------------
async function adminFetch(pathSeg, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/${pathSeg}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Auth admin ${pathSeg} ${r.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function ensureDemoUser() {
  // Look up by email via admin list (paginated; search by email param supported).
  const list = await adminFetch(`users?per_page=200`, { method: 'GET' });
  const existing = (list.users || []).find(
    (u) => (u.email || '').toLowerCase() === DEMO_EMAIL,
  );
  if (existing) {
    console.log(`Usuario demo ya existe (id=${existing.id}). Reusando.`);
    // Ensure password + confirmed for predictable login.
    await adminFetch(`users/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify({ password: DEMO_PASSWORD, email_confirm: true }),
    });
    return existing.id;
  }
  const created = await adminFetch(`users`, {
    method: 'POST',
    body: JSON.stringify({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    }),
  });
  console.log(`Usuario demo creado (id=${created.id}).`);
  return created.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const today = (await sql(`select current_date::text as d`))[0].d; // YYYY-MM-DD
  const startISO = addDaysISO(today, -28); // ventana ~4 semanas
  console.log(`TODAY=${today}  PLAN_START=${startISO}`);

  const studentId = await ensureDemoUser();

  // --- Coach (Evelyn) ---
  const coachRows = await sql(`select id from public.profiles where email = ${q(OWNER_EMAIL)} and role='coach' limit 1`);
  if (!coachRows.length) throw new Error(`No se encontró coach con email ${OWNER_EMAIL}`);
  const coachId = coachRows[0].id;
  console.log(`Coach=${coachId}`);

  // --- Limpieza idempotente de datos hijos de la alumna demo ---
  console.log('Limpiando datos previos de la alumna demo (si existen)...');
  await sql(`
    delete from public.food_log_items where food_log_id in (select id from public.food_logs where student_id = ${q(studentId)});
    delete from public.food_logs where student_id = ${q(studentId)};
    delete from public.workout_log_sets where workout_log_id in (select id from public.workout_logs where student_id = ${q(studentId)});
    delete from public.workout_logs where student_id = ${q(studentId)};
    delete from public.weight_entries where student_id = ${q(studentId)};
    delete from public.body_measurements where student_id = ${q(studentId)};
    delete from public.workout_plan_exercises where workout_plan_day_id in (
      select d.id from public.workout_plan_days d join public.workout_plans p on p.id = d.workout_plan_id where p.student_id = ${q(studentId)});
    delete from public.workout_plan_days where workout_plan_id in (select id from public.workout_plans where student_id = ${q(studentId)});
    delete from public.workout_plans where student_id = ${q(studentId)};
    delete from public.nutrition_plan_food_recommendations where nutrition_plan_id in (select id from public.nutrition_plans where student_id = ${q(studentId)});
    delete from public.nutrition_plans where student_id = ${q(studentId)};
    delete from public.content_assignments where student_id = ${q(studentId)};
    delete from public.coach_notes where student_id = ${q(studentId)};
  `);

  // --- Profile + student_profile + coach link ---
  console.log('Configurando perfil de la alumna...');
  await sql(`
    -- Identificarse como service_role en la transacción para que el trigger
    -- prevent_role_escalation permita fijar el rol (si no, role queda NULL).
    select set_config('request.jwt.claims', '{"role":"service_role"}', true);
    update public.profiles
       set full_name = 'Valentina Demo',
           role = 'student',
           status = 'active',
           onboarding_completed = true,
           email = ${q(DEMO_EMAIL)}
     where id = ${q(studentId)};

    insert into public.student_profiles (user_id, date_of_birth, age, height_cm, initial_weight_kg, current_weight_kg, goal_weight_kg, goal, training_level, notes)
    values (${q(studentId)}, '1996-03-14', 30, 165, 68, 64.5, 62, 'Recomposición corporal: bajar grasa y ganar fuerza', 'intermedio', 'Alumna de demostración con ~1 mes de historial.')
    on conflict (user_id) do update set
      date_of_birth = excluded.date_of_birth, age = excluded.age, height_cm = excluded.height_cm,
      initial_weight_kg = excluded.initial_weight_kg, current_weight_kg = excluded.current_weight_kg,
      goal_weight_kg = excluded.goal_weight_kg, goal = excluded.goal,
      training_level = excluded.training_level, notes = excluded.notes;

    insert into public.coach_students (coach_id, student_id, status, started_at)
    values (${q(coachId)}, ${q(studentId)}, 'active', ${q(startISO)})
    on conflict (coach_id, student_id) do update set status = 'active';
  `);

  // --- Exercises lookup (real ids) ---
  const exRows = await sql(`select id, name, muscle_group from public.exercises where is_global = true`);
  const exByName = new Map(exRows.map((e) => [e.name, e.id]));
  function ex(name) {
    const id = exByName.get(name);
    if (!id) throw new Error(`Ejercicio no encontrado: ${name}`);
    return id;
  }

  // --- Workout plan (PPL+UL) ---
  console.log('Creando plan de entrenamiento PPL+UL...');
  const WEEKS = 5;
  const planRows = await sql(`
    insert into public.workout_plans (coach_id, student_id, title, focus, level, split_type, status, weeks, starts_at, estimated_duration_minutes)
    values (${q(coachId)}, ${q(studentId)}, 'Hipertrofia PPL+UL', 'Hipertrofia y recomposición', 'intermedio', 'ppl_ul', 'active', ${WEEKS}, ${q(startISO)}, 70)
    returning id;
  `);
  const planId = planRows[0].id;

  // Days: weekday 1=Mon..7=Sun
  const dayDefs = [
    { day_number: 1, weekday: 1, title: 'Empuje', focus: 'Pecho, hombros, tríceps' },
    { day_number: 2, weekday: 2, title: 'Jalón', focus: 'Espalda, bíceps' },
    { day_number: 3, weekday: 3, title: 'Pierna', focus: 'Cuádriceps, femoral, glúteo' },
    { day_number: 4, weekday: 5, title: 'Torso', focus: 'Tren superior completo' },
    { day_number: 5, weekday: 6, title: 'Pierna / Full', focus: 'Inferior + glúteo' },
  ];

  // Exercises per day: [name, sets, reps, suggestedWeightKg]
  const dayExercises = {
    1: [
      ['Press de banca', 4, '8-12', 30],
      ['Press inclinado con mancuernas', 3, '10-12', 14],
      ['Press de Hombro', 3, '8-12', 18],
      ['Elevaciones laterales', 3, '12-15', 6],
      ['Extensión de tríceps en polea', 3, '12-15', 20],
    ],
    2: [
      ['Jalón al Pecho', 4, '8-12', 35],
      ['Remo con barra', 3, '8-12', 30],
      ['Remo en polea baja', 3, '10-12', 32],
      ['Curl con mancuernas', 3, '10-12', 8],
      ['Curl martillo', 3, '10-12', 8],
    ],
    3: [
      ['Sentadilla con barra', 4, '8-12', 40],
      ['Prensa', 3, '10-12', 80],
      ['Curl Femoral', 3, '10-12', 25],
      ['Hip Thrust', 3, '10-12', 50],
      ['Elevación de gemelos de pie', 3, '12-15', 30],
    ],
    4: [
      ['Press de pecho en máquina', 3, '10-12', 30],
      ['Remo en máquina', 3, '10-12', 35],
      ['Press militar', 3, '8-12', 20],
      ['Jalón al Pecho', 3, '10-12', 35],
      ['Aperturas con mancuernas', 3, '12-15', 8],
    ],
    5: [
      ['Peso Muerto Rumano', 4, '8-12', 40],
      ['Sentadilla búlgara', 3, '10-12', 12],
      ['Hip Thrust', 4, '10-12', 55],
      ['Extensión de cuádriceps', 3, '12-15', 30],
      ['Abducción de Cadera', 3, '15-20', 35],
    ],
  };

  const dayIdByNumber = {};
  for (const d of dayDefs) {
    const row = await sql(`
      insert into public.workout_plan_days (workout_plan_id, day_number, title, focus, weekday)
      values (${q(planId)}, ${d.day_number}, ${q(d.title)}, ${q(d.focus)}, ${d.weekday})
      returning id;
    `);
    dayIdByNumber[d.day_number] = row[0].id;
    const exs = dayExercises[d.day_number];
    const values = exs.map((e, i) =>
      `(${q(row[0].id)}, ${q(ex(e[0]))}, ${i}, ${e[1]}, ${q(e[2])}, ${q(e[3])}, 90)`,
    ).join(',\n');
    await sql(`
      insert into public.workout_plan_exercises (workout_plan_day_id, exercise_id, sort_order, sets, reps, suggested_weight_kg, rest_seconds)
      values ${values};
    `);
  }
  console.log(`Plan creado: ${dayDefs.length} días, ${Object.values(dayExercises).flat().length} ejercicios.`);

  // --- Workout logs across the window, with progressive overload ---
  console.log('Generando logs de entrenamiento (sobrecarga progresiva)...');
  // weekday -> day_number for scheduling
  const weekdayToDayNum = {};
  for (const d of dayDefs) weekdayToDayNum[d.weekday] = d.day_number;

  // Reps midpoint parser
  function repsMid(reps) {
    const m = reps.match(/(\d+)-(\d+)/);
    if (m) return Math.round((Number(m[1]) + Number(m[2])) / 2);
    return Number(reps) || 10;
  }

  let logsCompleted = 0, logsSkipped = 0, setsInserted = 0, sessionsUnlogged = 0;
  let sessionIdx = 0;
  // Iterate each date in window up to today (inclusive)
  for (let iso = startISO; iso <= today; iso = addDaysISO(iso, 1)) {
    const wd = weekdayOf(iso);
    const dayNum = weekdayToDayNum[wd];
    if (!dayNum) continue; // rest day
    const weekNum = Math.floor((parseUTC(iso) - parseUTC(startISO)) / (7 * 86400000)); // 0-based
    sessionIdx++;

    // Variety: leave 2 sessions completely unlogged, a few skipped, rest completed.
    // Use deterministic pattern based on sessionIdx.
    let status;
    if (sessionIdx === 4 || sessionIdx === 11) {
      // unlogged: no row at all
      sessionsUnlogged++;
      continue;
    } else if (sessionIdx === 6 || sessionIdx === 14) {
      status = 'skipped';
    } else {
      status = 'completed';
    }

    const effort = status === 'completed' ? 6 + (sessionIdx % 4) : null; // 6-9
    const logRow = await sql(`
      insert into public.workout_logs (student_id, coach_id, workout_plan_id, workout_plan_day_id, session_date, logged_at, status, perceived_effort)
      values (${q(studentId)}, ${q(coachId)}, ${q(planId)}, ${q(dayIdByNumber[dayNum])}, ${q(iso)}, ${q(iso + 'T18:30:00Z')}, ${q(status)}, ${effort === null ? 'null' : effort})
      returning id;
    `);
    if (status === 'skipped') { logsSkipped++; continue; }
    logsCompleted++;

    // Sets per exercise with progressive overload (+2.5kg/week per lift)
    const exs = dayExercises[dayNum];
    const setValues = [];
    exs.forEach((e) => {
      const [name, sets, reps, baseW] = e;
      const exerciseId = ex(name);
      const weekW = Math.round((baseW + weekNum * 2.5) * 2) / 2; // round to 0.5
      const targetReps = repsMid(reps);
      for (let s = 1; s <= sets; s++) {
        // a few sets not completed on some days to show partial
        const completed = !(sessionIdx % 5 === 0 && s === sets);
        // last set slight rep drop
        const repsDone = s === sets ? Math.max(targetReps - 2, 6) : targetReps;
        setValues.push(
          `(${q(logRow[0].id)}, ${q(exerciseId)}, ${s}, ${completed ? repsDone : Math.max(repsDone - 3, 3)}, ${weekW}, ${completed ? 'true' : 'false'})`,
        );
      }
    });
    await sql(`
      insert into public.workout_log_sets (workout_log_id, exercise_id, set_number, reps_completed, weight_kg, completed)
      values ${setValues.join(',\n')};
    `);
    setsInserted += setValues.length;
  }
  console.log(`Logs: ${logsCompleted} completados, ${logsSkipped} saltados, ${sessionsUnlogged} sin registro; ${setsInserted} series.`);

  // --- Weight entries (~2x/week, trend 68 -> ~64.5) ---
  console.log('Generando registros de peso...');
  const weightValues = [];
  const totalDays = 28;
  let weightCount = 0;
  for (let off = 0; off <= totalDays; off += 3) {
    const iso = addDaysISO(startISO, off);
    if (iso > today) break;
    // Linear trend from 68 to 64.5 with small noise
    const frac = off / totalDays;
    const base = 68 - frac * 3.5;
    const noise = ((off * 7) % 5 - 2) * 0.15; // deterministic +-0.3
    const w = Math.round((base + noise) * 10) / 10;
    weightValues.push(`(${q(studentId)}, ${q(coachId)}, ${w}, ${q(iso)})`);
    weightCount++;
  }
  await sql(`insert into public.weight_entries (student_id, coach_id, weight_kg, recorded_at) values ${weightValues.join(',')};`);
  console.log(`Peso: ${weightCount} registros.`);

  // --- Body measurements (start vs recent) ---
  console.log('Generando medidas corporales...');
  await sql(`
    insert into public.body_measurements (student_id, coach_id, recorded_at, waist_cm, hip_cm, chest_cm, thigh_cm, arm_cm, notes)
    values
      (${q(studentId)}, ${q(coachId)}, ${q(startISO)}, 78, 100, 92, 58, 29, 'Medidas iniciales'),
      (${q(studentId)}, ${q(coachId)}, ${q(addDaysISO(startISO, 14))}, 76.5, 99, 92, 57.5, 29.3, 'A las 2 semanas'),
      (${q(studentId)}, ${q(coachId)}, ${q(today)}, 75, 98, 92.5, 57, 29.6, 'Cintura baja, brazo y pecho suben (recomp)');
  `);

  // --- Nutrition plan ---
  console.log('Creando plan de nutrición + comidas...');
  const npRows = await sql(`
    insert into public.nutrition_plans (coach_id, student_id, title, calories_target, protein_target_g, carbs_target_g, fat_target_g, meals_per_day, status, starts_at, notes)
    values (${q(coachId)}, ${q(studentId)}, 'Recomposición - 1800 kcal', 1800, 140, 170, 55, 4, 'active', ${q(startISO)}, 'Prioriza proteína en cada comida; verduras libres.')
    returning id;
  `);
  const npId = npRows[0].id;
  await sql(`
    insert into public.nutrition_plan_food_recommendations (nutrition_plan_id, type, food_name, notes) values
      (${q(npId)}, 'recommended', 'Pechuga de pollo', 'Fuente magra principal'),
      (${q(npId)}, 'recommended', 'Yogur griego', 'Snack proteico'),
      (${q(npId)}, 'recommended', 'Arroz integral cocido', 'Carbo principal'),
      (${q(npId)}, 'limited', 'Chocolate negro 70%', 'Con moderación');
  `);

  // Foods lookup for logging
  const foodRows = await sql(`select id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit, unit_label from public.food_items where is_public = true`);
  const foodByName = new Map(foodRows.map((f) => [f.name, f]));
  function food(name) {
    const f = foodByName.get(name);
    if (!f) throw new Error(`Alimento no encontrado: ${name}`);
    return f;
  }
  function macros(f, grams) {
    const k = grams / 100;
    return {
      calories: Math.round(Number(f.calories_per_100g) * k),
      protein: Math.round(Number(f.protein_per_100g) * k * 10) / 10,
      carbs: Math.round(Number(f.carbs_per_100g) * k * 10) / 10,
      fat: Math.round(Number(f.fat_per_100g) * k * 10) / 10,
    };
  }

  // A few meal templates. Each item: {name, grams} or {name, units} for unit foods.
  const mealTemplates = {
    breakfast: [
      [{ n: 'Avena en hojuelas', g: 50 }, { n: 'Huevos', units: 2 }, { n: 'Banana', units: 1 }],
      [{ n: 'Yogur griego', g: 200 }, { n: 'Granola', g: 40 }, { n: 'Arándanos', g: 60 }],
      [{ n: 'Pan integral', units: 2 }, { n: 'Huevos', units: 2 }, { n: 'Aguacate', g: 50 }],
    ],
    lunch: [
      [{ n: 'Pechuga de pollo', g: 180 }, { n: 'Arroz integral cocido', g: 150 }, { n: 'Brócoli', g: 120 }],
      [{ n: 'Carne molida 90/10', g: 150 }, { n: 'Papa cocida', g: 200 }, { n: 'Espinaca', g: 80 }],
      [{ n: 'Salmón', g: 150 }, { n: 'Quinua cocida', g: 150 }, { n: 'Tomate', g: 100 }],
    ],
    dinner: [
      [{ n: 'Pechuga de pavo', g: 150 }, { n: 'Camote (batata)', g: 180 }, { n: 'Calabacín (zucchini)', g: 120 }],
      [{ n: 'Tilapia', g: 180 }, { n: 'Arroz cocido', g: 130 }, { n: 'Lechuga', g: 80 }],
      [{ n: 'Atún en agua (lata)', g: 120 }, { n: 'Frijol negro cocido', g: 120 }, { n: 'Aguacate', g: 50 }],
    ],
    snack: [
      [{ n: 'Whey protein (polvo)', g: 30 }, { n: 'Manzana', g: 150 }],
      [{ n: 'Requesón (cottage)', g: 150 }, { n: 'Almendras', g: 20 }],
      [{ n: 'Yogur griego', g: 150 }, { n: 'Fresa', g: 100 }],
    ],
  };

  let foodLogCount = 0, foodItemCount = 0;
  let dayCounter = 0;
  for (let iso = startISO; iso <= today; iso = addDaysISO(iso, 1)) {
    dayCounter++;
    // Skip ~1 in 6 days entirely (adherence variety / unlogged days)
    if (dayCounter % 6 === 0) continue;

    // Decide which meals are logged today (sometimes skip a meal)
    const mealsToday = ['breakfast', 'lunch', 'dinner'];
    if (dayCounter % 2 === 0) mealsToday.push('snack'); // snack on even days

    // Portion multiplier to make some days hit target and some not.
    // mult ~ 0.85..1.1 deterministic
    const mult = 0.85 + ((dayCounter * 13) % 26) / 100; // 0.85..1.10

    const mealTimes = { breakfast: '08:00:00Z', lunch: '13:00:00Z', dinner: '20:00:00Z', snack: '16:30:00Z' };
    for (const meal of mealsToday) {
      const templates = mealTemplates[meal];
      const tpl = templates[(dayCounter + meal.length) % templates.length];
      const logRow = await sql(`
        insert into public.food_logs (student_id, coach_id, nutrition_plan_id, meal_type, logged_at, coach_review_status)
        values (${q(studentId)}, ${q(coachId)}, ${q(npId)}, ${q(meal)}, ${q(iso + 'T' + mealTimes[meal])}, 'pending')
        returning id;
      `);
      foodLogCount++;
      const itemValues = [];
      for (const item of tpl) {
        const f = food(item.n);
        let grams, unit, quantity;
        if (item.units != null && f.grams_per_unit) {
          quantity = item.units;
          unit = f.unit_label || 'unidad';
          grams = Math.round(item.units * Number(f.grams_per_unit) * mult);
          quantity = Math.round(item.units * mult * 10) / 10;
        } else {
          grams = Math.round((item.g || 100) * mult);
          unit = 'g';
          quantity = grams;
        }
        const m = macros(f, grams);
        itemValues.push(
          `(${q(logRow[0].id)}, ${q(f.id)}, ${grams}, ${m.calories}, ${m.protein}, ${m.carbs}, ${m.fat}, ${q(unit)}, ${quantity})`,
        );
        foodItemCount++;
      }
      await sql(`
        insert into public.food_log_items (food_log_id, food_item_id, grams, calories, protein_g, carbs_g, fat_g, unit, quantity)
        values ${itemValues.join(',\n')};
      `);
    }
  }
  console.log(`Nutrición: ${foodLogCount} comidas, ${foodItemCount} items.`);

  // --- Tips (content_assignments) ---
  console.log('Asignando tips...');
  const posts = await sql(`select id from public.content_posts where coach_id = ${q(coachId)} and status = 'published' limit 2`);
  let tipsAssigned = 0;
  for (const p of posts) {
    await sql(`
      insert into public.content_assignments (content_post_id, student_id, coach_id, assigned_at)
      values (${q(p.id)}, ${q(studentId)}, ${q(coachId)}, ${q(addDaysISO(startISO, 2) + 'T10:00:00Z')})
      on conflict (content_post_id, student_id) do nothing;
    `);
    tipsAssigned++;
  }
  console.log(`Tips asignados: ${tipsAssigned}.`);

  // --- A couple of coach notes for realism ---
  await sql(`
    insert into public.coach_notes (coach_id, student_id, note, category) values
      (${q(coachId)}, ${q(studentId)}, 'Buena adherencia las primeras semanas. Subir carga en sentadilla.', 'entrenamiento'),
      (${q(coachId)}, ${q(studentId)}, 'Revisar proteína los fines de semana, tiende a bajar.', 'nutricion');
  `);

  // ---------------------------------------------------------------------------
  // Verification counts
  // ---------------------------------------------------------------------------
  const counts = await sql(`
    select
      (select count(*) from public.workout_logs where student_id = ${q(studentId)} and status='completed') as wl_completed,
      (select count(*) from public.workout_logs where student_id = ${q(studentId)} and status='skipped') as wl_skipped,
      (select count(*) from public.workout_log_sets s join public.workout_logs l on l.id=s.workout_log_id where l.student_id = ${q(studentId)}) as sets,
      (select count(*) from public.weight_entries where student_id = ${q(studentId)}) as weights,
      (select count(*) from public.body_measurements where student_id = ${q(studentId)}) as measurements,
      (select count(*) from public.food_logs where student_id = ${q(studentId)}) as food_logs,
      (select count(*) from public.food_log_items i join public.food_logs fl on fl.id=i.food_log_id where fl.student_id = ${q(studentId)}) as food_items,
      (select count(*) from public.workout_plans where student_id = ${q(studentId)}) as plans,
      (select count(*) from public.content_assignments where student_id = ${q(studentId)}) as tips;
  `);
  console.log('\n===== RESUMEN =====');
  console.log(JSON.stringify(counts[0], null, 2));
  console.log(`\nLogin demo:  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`);
  console.log(`Vinculada a coach (Evelyn) id=${coachId}.`);
  console.log('LISTO.');
}

main().catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
