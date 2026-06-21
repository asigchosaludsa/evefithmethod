import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/common';
import { FoodLogForm } from '@/components/student/FoodLogForm';

export const metadata = { title: 'Registrar comida' };

export default async function NewMealPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: foods } = await supabase
    .from('food_items')
    .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
    .or(`is_public.eq.true,created_by.eq.${profile.id}`)
    .order('name');

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/student/meals" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Mis comidas
      </Link>
      <PageHeader title="Registrar comida" description="Busca alimentos y registra lo que comiste." />
      <Card className="p-6">
        <FoodLogForm foodItems={foods ?? []} />
      </Card>
    </div>
  );
}
