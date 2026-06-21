import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, Card } from '@/components/common';
import { InviteStudentForm } from '@/components/coach/InviteStudentForm';

export const metadata = { title: 'Invitar alumna' };

export default function InviteStudentPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/coach/students" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Alumnas
      </Link>
      <PageHeader title="Invitar alumna" description="Genera un enlace de invitación para una nueva alumna." />
      <Card className="p-6">
        <InviteStudentForm />
      </Card>
    </div>
  );
}
