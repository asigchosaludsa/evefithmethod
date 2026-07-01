import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/common';
import { FoodLogForm } from '@/components/student/FoodLogForm';

export const metadata = { title: 'Registrar comida' };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function NewMealPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const profile = await requireStudent();
  const { date } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  // Solo acepta fechas válidas y no futuras; por defecto hoy.
  const initialDate = date && ISO_DATE.test(date) && date <= today ? date : today;

  const supabase = await createClient();
  const { data: foods } = await supabase
    .from('food_items')
    .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit, unit_label, source, created_by')
    .or(`is_public.eq.true,created_by.eq.${profile.id}`)
    .order('name');

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/student/meals" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Mis comidas
      </Link>
      <PageHeader title="Registrar comida" description="Busca alimentos y registra lo que comiste." />
      <Card className="p-6">
        <FoodLogForm foodItems={foods ?? []} userId={profile.id} initialDate={initialDate} />
      </Card>
    </div>
  );
}
