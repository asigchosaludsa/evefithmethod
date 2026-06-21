import { AuthShell } from '@/components/auth/AuthShell';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = { title: 'Crear cuenta' };

export default function RegisterPage() {
  return (
    <AuthShell title="Crea tu cuenta" subtitle="Empieza tu método con acompañamiento real">
      <OAuthButtons />
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-faint">
        <span className="h-px flex-1 bg-hairline" />o con tu email<span className="h-px flex-1 bg-hairline" />
      </div>
      <RegisterForm />
    </AuthShell>
  );
}
