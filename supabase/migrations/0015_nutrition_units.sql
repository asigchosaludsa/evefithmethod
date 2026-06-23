-- 0015_nutrition_units.sql
-- Soporte de unidades (g/ml/unidad) para registrar comida. Idempotente.

alter table public.food_items add column if not exists grams_per_unit numeric;
alter table public.food_items add column if not exists unit_label text;

alter table public.food_log_items add column if not exists unit text;
alter table public.food_log_items add column if not exists quantity numeric;

-- Backfill: registros antiguos quedan como gramos.
update public.food_log_items
set unit = 'g'
where unit is null;
update public.food_log_items
set quantity = grams
where quantity is null;

-- Seed idempotente de gramos/unidad para alimentos públicos comunes (no pisa valores ya puestos).
update public.food_items set grams_per_unit = 50, unit_label = 'huevo'
  where is_public = true and grams_per_unit is null and lower(name) like '%huevo%';
update public.food_items set grams_per_unit = 30, unit_label = 'rebanada'
  where is_public = true and grams_per_unit is null and (lower(name) like '%pan%' or lower(name) like '%rebanada%');
update public.food_items set grams_per_unit = 118, unit_label = 'unidad'
  where is_public = true and grams_per_unit is null and lower(name) like '%banana%';
