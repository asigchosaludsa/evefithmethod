import { AuthShell } from '@/components/auth/AuthShell';
import { LeadRequestForm } from '@/components/public/LeadRequestForm';

export const metadata = { title: 'Solicitar cupo' };

export default function SolicitudPage() {
  return (
    <AuthShell
      title="Empieza tu transformación"
      subtitle="Cuéntanos sobre ti y tu objetivo. La coach revisa cada solicitud personalmente."
    >
      <LeadRequestForm />
    </AuthShell>
  );
}
