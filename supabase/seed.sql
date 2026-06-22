-- seed.sql  (OPTIONAL — safe to run on an empty project)
-- Inserts only data that does NOT depend on real auth users:
--   * public food_items
--   * global exercises
-- Sample tips (content_posts) require a coach; an optional block at the end
-- creates them only if a coach profile already exists.
--
-- To create the FIRST coach: sign up via the app, then in Supabase SQL editor:
--   update public.profiles
--   set role = 'coach', status = 'active', onboarding_completed = true
--   where email = 'YOUR_EMAIL';

-- ----------------------------- food_items -----------------------------
insert into public.food_items (name, serving_unit, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source, is_public)
values
  ('Pechuga de pollo', '100g', 165, 31, 0, 3.6, 'seed', true),
  ('Arroz cocido', '100g', 130, 2.7, 28, 0.3, 'seed', true),
  ('Huevos', '100g', 155, 13, 1.1, 11, 'seed', true),
  ('Yogur griego', '100g', 59, 10, 3.6, 0.4, 'seed', true),
  ('Banana', '100g', 89, 1.1, 23, 0.3, 'seed', true),
  ('Avena', '100g', 389, 17, 66, 7, 'seed', true),
  ('Aguacate', '100g', 160, 2, 9, 15, 'seed', true),
  ('Atún', '100g', 132, 28, 0, 1, 'seed', true),
  ('Papa cocida', '100g', 87, 2, 20, 0.1, 'seed', true),
  ('Granola', '100g', 471, 10, 64, 20, 'seed', true),
  ('Salmón', '100g', 208, 20, 0, 13, 'seed', true),
  ('Brócoli', '100g', 34, 2.8, 7, 0.4, 'seed', true)
on conflict do nothing;

-- ----------------------------- exercises ------------------------------
insert into public.exercises (name, muscle_group, equipment, description, status, is_global)
values
  ('Hip Thrust', 'Glúteos', 'Barra', 'Empuje de cadera para glúteos.', 'published', true),
  ('Sentadilla Goblet', 'Cuádriceps', 'Mancuernas', 'Sentadilla sujetando una mancuerna al pecho.', 'published', true),
  ('Peso Muerto Rumano', 'Femoral', 'Barra', 'Bisagra de cadera con rodillas semiflexionadas.', 'published', true),
  ('Prensa', 'Cuádriceps', 'Máquina', 'Empuje de piernas en máquina de prensa.', 'published', true),
  ('Remo con Mancuerna', 'Espalda', 'Mancuernas', 'Remo a una mano apoyada en banco.', 'published', true),
  ('Press de Hombro', 'Hombros', 'Mancuernas', 'Press vertical de hombros.', 'published', true),
  ('Jalón al Pecho', 'Espalda', 'Polea', 'Jalón en polea alta hacia el pecho.', 'published', true),
  ('Curl Femoral', 'Femoral', 'Máquina', 'Flexión de rodilla en máquina.', 'published', true),
  ('Abducción de Cadera', 'Glúteos', 'Máquina', 'Apertura de piernas en máquina.', 'published', true),
  ('Plancha', 'Core', 'Peso corporal', 'Isometría de core en posición de plancha.', 'published', true)
on conflict do nothing;

-- ------------------------ sample tips (optional) ----------------------
do $$
declare
  v_coach uuid;
begin
  select id into v_coach from public.profiles where role = 'coach' order by created_at limit 1;
  if v_coach is not null then
    insert into public.content_posts (coach_id, title, category, summary, body, status, published_at)
    values
      (v_coach, 'Cómo completar proteína sin complicarte', 'Nutrición', 'Trucos simples para llegar a tu meta de proteína.', 'Incluye una fuente de proteína en cada comida...', 'published', now()),
      (v_coach, 'Qué hacer si fallaste un día', 'Motivación', 'Un día no define tu progreso.', 'Retoma al día siguiente sin compensar de más...', 'published', now()),
      (v_coach, 'Cómo organizar tus comidas', 'Organización', 'Planifica para no improvisar.', 'Prepara porciones con anticipación...', 'published', now()),
      (v_coach, 'Errores comunes en Hip Thrust', 'Técnica', 'Evita estos fallos frecuentes.', 'Mantén el mentón neutro y empuja con los talones...', 'published', now()),
      (v_coach, 'Recuperación y sueño', 'Recuperación', 'El descanso también entrena.', 'Apunta a 7-9 horas de sueño...', 'published', now())
    on conflict do nothing;
  end if;
end $$;
