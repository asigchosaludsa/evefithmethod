-- 0012_exercise_catalog_seed.sql
-- Catálogo curado de ejercicios globales en español, categorizados.
-- Idempotente: el índice único exercises_global_name_uidx (0011) hace que
-- 'on conflict do nothing' descarte nombres ya existentes (incluye los 10 previos).

insert into public.exercises (name, muscle_group, equipment, difficulty, movement_pattern, description, status, is_global)
values
  -- Glúteos
  ('Puente de glúteo', 'Glúteos', 'Peso corporal', 'principiante', 'dominante_cadera', 'Elevación de cadera desde el suelo.', 'published', true),
  ('Patada de glúteo en polea', 'Glúteos', 'Polea', 'principiante', 'dominante_cadera', 'Extensión de cadera en polea baja.', 'published', true),
  ('Peso muerto sumo', 'Glúteos', 'Barra', 'avanzado', 'dominante_cadera', 'Peso muerto con stance amplio.', 'published', true),
  -- Cuádriceps
  ('Sentadilla con barra', 'Cuádriceps', 'Barra', 'intermedio', 'dominante_rodilla', 'Sentadilla trasera con barra.', 'published', true),
  ('Extensión de cuádriceps', 'Cuádriceps', 'Máquina', 'principiante', 'dominante_rodilla', 'Extensión de rodilla en máquina.', 'published', true),
  ('Zancadas', 'Cuádriceps', 'Mancuernas', 'intermedio', 'dominante_rodilla', 'Desplazamientos en zancada.', 'published', true),
  ('Sentadilla búlgara', 'Cuádriceps', 'Mancuernas', 'intermedio', 'dominante_rodilla', 'Sentadilla a una pierna con pie atrás elevado.', 'published', true),
  ('Hack squat', 'Cuádriceps', 'Máquina', 'intermedio', 'dominante_rodilla', 'Sentadilla en máquina hack.', 'published', true),
  -- Femoral
  ('Curl femoral sentado', 'Femoral', 'Máquina', 'principiante', 'dominante_rodilla', 'Flexión de rodilla sentado.', 'published', true),
  ('Buenos días', 'Femoral', 'Barra', 'avanzado', 'dominante_cadera', 'Bisagra de cadera con barra en espalda.', 'published', true),
  ('Peso muerto convencional', 'Femoral', 'Barra', 'avanzado', 'dominante_cadera', 'Peso muerto desde el suelo.', 'published', true),
  -- Espalda
  ('Dominadas', 'Espalda', 'Peso corporal', 'avanzado', 'traccion', 'Tracción vertical en barra.', 'published', true),
  ('Remo con barra', 'Espalda', 'Barra', 'intermedio', 'traccion', 'Remo inclinado con barra.', 'published', true),
  ('Remo en máquina', 'Espalda', 'Máquina', 'principiante', 'traccion', 'Remo sentado en máquina.', 'published', true),
  ('Remo en polea baja', 'Espalda', 'Polea', 'principiante', 'traccion', 'Remo horizontal en polea.', 'published', true),
  ('Pullover en polea', 'Espalda', 'Polea', 'intermedio', 'traccion', 'Extensión de hombro en polea alta.', 'published', true),
  -- Pecho
  ('Press de banca', 'Pecho', 'Barra', 'intermedio', 'empuje', 'Press horizontal con barra.', 'published', true),
  ('Press inclinado con mancuernas', 'Pecho', 'Mancuernas', 'intermedio', 'empuje', 'Press en banco inclinado.', 'published', true),
  ('Press de pecho en máquina', 'Pecho', 'Máquina', 'principiante', 'empuje', 'Press horizontal en máquina.', 'published', true),
  ('Aperturas con mancuernas', 'Pecho', 'Mancuernas', 'principiante', 'empuje', 'Apertura de pecho en banco.', 'published', true),
  ('Cruce en polea', 'Pecho', 'Polea', 'intermedio', 'empuje', 'Cruce de poleas para pecho.', 'published', true),
  ('Flexiones', 'Pecho', 'Peso corporal', 'principiante', 'empuje', 'Flexiones de brazos.', 'published', true),
  -- Hombros
  ('Press militar', 'Hombros', 'Barra', 'intermedio', 'empuje', 'Press vertical de pie con barra.', 'published', true),
  ('Elevaciones laterales', 'Hombros', 'Mancuernas', 'principiante', 'empuje', 'Elevación lateral de deltoides.', 'published', true),
  ('Elevaciones frontales', 'Hombros', 'Mancuernas', 'principiante', 'empuje', 'Elevación frontal de deltoides.', 'published', true),
  ('Face pull', 'Hombros', 'Polea', 'principiante', 'traccion', 'Tracción a la cara para deltoide posterior.', 'published', true),
  -- Bíceps
  ('Curl con barra', 'Bíceps', 'Barra', 'principiante', 'traccion', 'Curl de bíceps con barra.', 'published', true),
  ('Curl con mancuernas', 'Bíceps', 'Mancuernas', 'principiante', 'traccion', 'Curl alterno de bíceps.', 'published', true),
  ('Curl martillo', 'Bíceps', 'Mancuernas', 'principiante', 'traccion', 'Curl con agarre neutro.', 'published', true),
  -- Tríceps
  ('Extensión de tríceps en polea', 'Tríceps', 'Polea', 'principiante', 'empuje', 'Extensión de codo en polea alta.', 'published', true),
  ('Press francés', 'Tríceps', 'Barra', 'intermedio', 'empuje', 'Extensión de tríceps tumbado.', 'published', true),
  ('Fondos en banco', 'Tríceps', 'Peso corporal', 'principiante', 'empuje', 'Fondos de tríceps en banco.', 'published', true),
  -- Core
  ('Crunch abdominal', 'Core', 'Peso corporal', 'principiante', 'core', 'Encogimiento abdominal.', 'published', true),
  ('Elevación de piernas', 'Core', 'Peso corporal', 'intermedio', 'core', 'Elevación de piernas para abdomen inferior.', 'published', true),
  ('Russian twist', 'Core', 'Peso corporal', 'intermedio', 'core', 'Giros de tronco sentado.', 'published', true),
  -- Gemelos
  ('Elevación de gemelos de pie', 'Gemelos', 'Máquina', 'principiante', 'dominante_rodilla', 'Elevación de talones de pie.', 'published', true),
  ('Elevación de gemelos sentado', 'Gemelos', 'Máquina', 'principiante', 'dominante_rodilla', 'Elevación de talones sentado.', 'published', true),
  -- Cardio / cuerpo completo (movement_pattern nulo cuando no aplica)
  ('Caminadora', 'Cardio', 'Máquina', 'principiante', null, 'Caminata o trote en cinta.', 'published', true),
  ('Bicicleta estática', 'Cardio', 'Máquina', 'principiante', null, 'Cardio en bicicleta estática.', 'published', true),
  ('Kettlebell swing', 'Cuerpo completo', 'Kettlebell', 'intermedio', 'dominante_cadera', 'Balanceo de kettlebell.', 'published', true),
  ('Burpees', 'Cuerpo completo', 'Peso corporal', 'intermedio', null, 'Ejercicio de cuerpo completo de alta intensidad.', 'published', true)
on conflict do nothing;
