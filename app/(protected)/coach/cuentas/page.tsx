import { requireCoach } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOwnerEmail } from '@/lib/auth/owner';
import { cancelInvitationAdmin } from '@/lib/coach/account-actions';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, SectionHeader } from '@/components/common';
import { DeleteAccountButton } from '@/components/coach/DeleteAccountButton';
import { formatDate } from '@/lib/utils/date';

export const metadata = { title: 'Cuentas' };

const ROLE_LABEL: Record<string, string> = { coach: 'Coach', admin: 'Admin', student: 'Alumna' };

export default async function CuentasPage() {
  const coach = await requireCoach();
  const admin = createAdminClient();

  const { data: allAccounts } = await admin
    .from('profiles')
    .select('id, email, full_name, role, status, created_at, is_demo')
    .order('created_at', { ascending: false });

  // Las sesiones demo efímeras (is_demo) no se listan: son transitorias y se
  // borran solas. Solo mostramos su conteo. La plantilla (demo.alumna@…) NO es
  // is_demo, así que sí aparece (marcada como plantilla).
  const accounts = (allAccounts ?? []).filter((a) => !a.is_demo);
  const demoSessions = (allAccounts ?? []).filter((a) => a.is_demo).length;
  const TEMPLATE_EMAIL = 'demo.alumna@evefitmethod.com';

  const { data: invites } = await admin
    .from('invitations')
    .select('id, email, student_name, created_at, expires_at')
    .eq('coach_id', coach.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cuentas"
        description="Todas las cuentas registradas e invitaciones. Elimina una cuenta para liberar su correo y permitir que vuelva a registrarse."
      />

      <Card>
        <CardHeader>
          <CardTitle>Cuentas registradas ({accounts.length})</CardTitle>
          {demoSessions > 0 && (
            <p className="mt-1 text-xs text-faint">
              + {demoSessions} {demoSessions === 1 ? 'sesión demo activa' : 'sesiones demo activas'} (se borran solas)
            </p>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {!accounts || accounts.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Sin cuentas" description="Aún no hay cuentas registradas." />
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {accounts.map((a) => {
                const isTemplate = a.email === TEMPLATE_EMAIL;
                const protectedAcct =
                  a.id === coach.id || a.role === 'coach' || a.role === 'admin' || isOwnerEmail(a.email) || isTemplate;
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {a.full_name || 'Sin nombre'}
                      </p>
                      <p className="truncate text-xs text-muted">{a.email}</p>
                    </div>
                    {isTemplate ? (
                      <Badge tone="primary">DEMO · plantilla</Badge>
                    ) : (
                      <Badge tone={a.role === 'student' ? 'info' : a.role ? 'primary' : 'neutral'}>
                        {a.role ? (ROLE_LABEL[a.role] ?? a.role) : 'Sin rol'}
                      </Badge>
                    )}
                    <Badge tone={a.status === 'active' ? 'success' : 'neutral'}>{a.status}</Badge>
                    <span className="hidden text-xs text-faint sm:inline">{formatDate(a.created_at)}</span>
                    <div className="ml-auto">
                      {protectedAcct ? (
                        <span className="text-[11px] text-faint">Cuenta protegida</span>
                      ) : (
                        <DeleteAccountButton userId={a.id} label={a.full_name || a.email || 'esta cuenta'} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <div>
        <SectionHeader title="Invitaciones pendientes" />
        <Card className="mt-3">
          <CardBody className="p-0">
            {!invites || invites.length === 0 ? (
              <div className="p-4">
                <EmptyState title="Sin invitaciones pendientes" description="Las invitaciones que generes aparecerán aquí." />
              </div>
            ) : (
              <ul className="divide-y divide-hairline">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{inv.student_name || 'Invitada'}</p>
                      <p className="truncate text-xs text-muted">{inv.email}</p>
                    </div>
                    <span className="hidden text-xs text-faint sm:inline">
                      Vence {inv.expires_at ? formatDate(inv.expires_at) : 'sin fecha'}
                    </span>
                    <form action={cancelInvitationAdmin.bind(null, inv.id)} className="ml-auto">
                      <Button type="submit" variant="outline" size="sm">
                        Cancelar
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
