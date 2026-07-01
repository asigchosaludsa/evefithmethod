'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStudent } from '@/lib/auth/roles';
import type { NewFood } from '@/lib/student/food-actions';

/**
 * Integración con Open Food Facts (OFF) — base de alimentos pública, sin API key.
 *
 * Filosofía: FAIL-SOFT. Si OFF está caído, es lento o responde mal, las acciones
 * devuelven `[]` / un error suave; la búsqueda local y "Crear alimento" siguen
 * funcionando. Nunca bloquea el flujo de registro de comidas.
 *
 * La calidad de los datos de OFF varía (es colaborativo); es aceptable.
 */

/** Resultado de búsqueda en OFF, ya mapeado a macros por 100 g. */
export interface OffProduct {
  /** Código de barras (identificador estable en OFF). */
  code: string;
  /** Nombre legible (prefiere ES, con marca entre paréntesis si existe). */
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = 'code,product_name,product_name_es,brands,nutriments';
const TIMEOUT_MS = 5000;
const PAGE_SIZE = 24;

/** Redondea a 1 decimal, tolerando ruido de coma flotante. */
function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** Extrae un número finito >= 0 de un valor desconocido, o `null`. */
function num(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
  return n;
}

interface OffRawProduct {
  code?: unknown;
  product_name?: unknown;
  product_name_es?: unknown;
  brands?: unknown;
  nutriments?: Record<string, unknown>;
}

/** Construye el nombre legible: nombre (ES preferido) + primera marca. */
function buildName(p: OffRawProduct): string | null {
  const raw = (typeof p.product_name_es === 'string' && p.product_name_es.trim()) ||
    (typeof p.product_name === 'string' && p.product_name.trim());
  if (!raw) return null;
  let name = raw;
  if (typeof p.brands === 'string' && p.brands.trim()) {
    const brand = p.brands.split(',')[0]?.trim();
    if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
      name = `${name} (${brand})`;
    }
  }
  return name.slice(0, 120);
}

/** Mapea un producto crudo de OFF a `OffProduct`, o `null` si no es usable. */
function mapProduct(p: OffRawProduct): OffProduct | null {
  const name = buildName(p);
  if (!name) return null;
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']);
  if (kcal === null) return null; // sin calorías no sirve
  const code = typeof p.code === 'string' ? p.code : String(p.code ?? '');
  if (!code) return null;
  return {
    code,
    name,
    calories_per_100g: round1(kcal),
    protein_per_100g: round1(num(n['proteins_100g']) ?? 0),
    carbs_per_100g: round1(num(n['carbohydrates_100g']) ?? 0),
    fat_per_100g: round1(num(n['fat_100g']) ?? 0),
  };
}

/**
 * Busca alimentos en Open Food Facts. Devuelve `[]` ante cualquier error
 * (timeout, red, JSON inválido). Solo accesible para alumnas autenticadas.
 */
export async function searchOpenFoodFacts(query: string): Promise<OffProduct[]> {
  await requireStudent();

  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(PAGE_SIZE),
    // Prioriza productos populares (más escaneados) → resultados más útiles.
    sort_by: 'popularity_key',
    lc: 'es',
    fields: FIELDS,
  });
  const url = `${OFF_SEARCH_URL}?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // OFF pide un User-Agent identificable.
        'User-Agent': 'EveFitMethod/1.0 (https://evefitmethod.com)',
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const products = (json as { products?: unknown }).products;
    if (!Array.isArray(products)) return [];

    const seen = new Set<string>();
    const out: OffProduct[] = [];
    for (const raw of products) {
      const mapped = mapProduct(raw as OffRawProduct);
      if (!mapped) continue;
      // Dedupe en memoria por nombre normalizado (OFF a veces repite).
      const key = mapped.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(mapped);
    }
    return out;
  } catch {
    // Fail-soft: cualquier problema con OFF → sin resultados externos.
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const SELECT_FOOD =
  'id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit, unit_label';

/** Valida que un producto OFF traiga datos coherentes antes de persistir. */
function validateProduct(p: OffProduct): string | null {
  if (!p || typeof p.name !== 'string' || p.name.trim().length === 0) return 'Producto inválido.';
  const fields: [number, number][] = [
    [p.calories_per_100g, 2000],
    [p.protein_per_100g, 1000],
    [p.carbs_per_100g, 1000],
    [p.fat_per_100g, 1000],
  ];
  for (const [v, max] of fields) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) {
      return 'Los valores nutricionales del producto no son válidos.';
    }
  }
  return null;
}

/**
 * Importa (o reutiliza) un producto de OFF como `food_items` público para que
 * fluya por la ruta de registro existente (que necesita un `food_item.id`).
 *
 * - `source = 'openfoodfacts'`, `is_public = true` (reutilizable / cacheado).
 * - Dedupe por `name` (ya incluye la marca); si ya existe uno público con el
 *   mismo nombre, se reutiliza en vez de duplicar.
 */
export async function importOpenFoodFactsItem(
  product: OffProduct,
): Promise<{ food?: NewFood; error?: string }> {
  const student = await requireStudent();

  const invalid = validateProduct(product);
  if (invalid) return { error: invalid };

  const name = product.name.trim().slice(0, 120);
  const supabase = await createClient();

  // Reutiliza un alimento OFF ya importado con el mismo nombre (cache global).
  const { data: existing } = await supabase
    .from('food_items')
    .select(SELECT_FOOD)
    .eq('name', name)
    .eq('source', 'openfoodfacts')
    .limit(1)
    .maybeSingle();
  if (existing) return { food: existing };

  const { data, error } = await supabase
    .from('food_items')
    .insert({
      name,
      brand: null,
      calories_per_100g: product.calories_per_100g,
      protein_per_100g: product.protein_per_100g,
      carbs_per_100g: product.carbs_per_100g,
      fat_per_100g: product.fat_per_100g,
      grams_per_unit: null,
      unit_label: null,
      source: 'openfoodfacts',
      created_by: student.id,
      is_public: true,
    })
    .select(SELECT_FOOD)
    .single();

  if (error || !data) {
    // Posible carrera: otro registro lo creó entre el SELECT y el INSERT.
    const { data: retry } = await supabase
      .from('food_items')
      .select(SELECT_FOOD)
      .eq('name', name)
      .eq('source', 'openfoodfacts')
      .limit(1)
      .maybeSingle();
    if (retry) return { food: retry };
    return { error: error?.message ?? 'No se pudo importar el alimento.' };
  }

  revalidatePath('/student/meals/new');
  return { food: data };
}

/** Normaliza un código de barras a dígitos (EAN/UPC: 8–14 dígitos). */
function cleanBarcode(code: string): string {
  return (code || '').replace(/\D/g, '');
}

/**
 * Busca un producto por código de barras en Open Food Facts (endpoint v2).
 * Devuelve el producto mapeado, o un error suave si no existe / OFF falla.
 */
export async function lookupOpenFoodFactsBarcode(
  code: string,
): Promise<{ product?: OffProduct; error?: string }> {
  await requireStudent();

  const barcode = cleanBarcode(code);
  if (barcode.length < 8 || barcode.length > 14) {
    return { error: 'Código de barras inválido.' };
  }

  const params = new URLSearchParams({ fields: FIELDS, lc: 'es' });
  const url = `${OFF_PRODUCT_URL}/${barcode}.json?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'EveFitMethod/1.0 (https://evefitmethod.com)' },
      cache: 'no-store',
    });
    if (!res.ok) return { error: 'No pudimos consultar el código. Intenta de nuevo.' };
    const json: unknown = await res.json();
    const status = (json as { status?: unknown }).status;
    const rawProduct = (json as { product?: unknown }).product;
    if (status !== 1 || !rawProduct || typeof rawProduct !== 'object') {
      return { error: 'Producto no encontrado. Puedes crearlo manualmente.' };
    }
    const mapped = mapProduct({ ...(rawProduct as OffRawProduct), code: barcode });
    if (!mapped) return { error: 'El producto no tiene datos nutricionales utilizables.' };
    return { product: mapped };
  } catch {
    return { error: 'No pudimos consultar el código de barras.' };
  } finally {
    clearTimeout(timer);
  }
}
