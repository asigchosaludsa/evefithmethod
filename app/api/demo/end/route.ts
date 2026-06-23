import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_demo')
      .eq('id', user.id)
      .maybeSingle();
    await supabase.auth.signOut();
    if (profile?.is_demo) {
      // Borrar la cuenta desechable (cascada borra todos sus datos).
      try {
        await createAdminClient().auth.admin.deleteUser(user.id);
      } catch {
        // Si falla, el cron de limpieza la borrará por demo_expires_at.
      }
    }
  }
  const url = new URL('/', request.url);
  return NextResponse.redirect(url, { status: 303 });
}
