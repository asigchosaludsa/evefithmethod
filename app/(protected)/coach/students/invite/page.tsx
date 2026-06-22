import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { getCoachInvitations } from '@/lib/db/queries/invitations';
import { PageHeader, Card, SectionHeader } from '@/components/common';
import { InviteStudentForm } from '@/components/coach/InviteStudentForm';
import { InvitationsList } from '@/components/coach/InvitationsList';

export const metadata = { title: 'Invitar alumna' };

export default async function InviteStudentPage() {
  const profile = await requireCoach();
  const invitations = await getCoachInvitations(profile.id);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/coach/students" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Alumnas
      </Link>
      <PageHeader title="Invitar alumna" description="Genera un enlace de invitación para una nueva alumna." />
      <Card className="p-6">
        <InviteStudentForm />
      </Card>

      <section className="space-y-3">
        <SectionHeader title="Invitaciones" />
        <InvitationsList invitations={invitations} />
      </section>
    </div>
  );
}
