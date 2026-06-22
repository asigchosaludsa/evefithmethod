import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dashboardPathForProfile, validateSafeRedirect } from '@/lib/auth/redirects';
import { ensureOwnerPromoted } from '@/lib/auth/owner';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = validateSafeRedirect(searchParams.get('next'), '');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Single-owner model: if this is the configured owner, ensure they are an
      // active coach before we compute the destination.
      if (user) await ensureOwnerPromoted(user.id, user.email);

      let dest = next;
      if (!dest) {
        const { data: profile } = user
          ? await supabase.from('profiles').select('*').eq('id', user.id).single()
          : { data: null };
        dest = dashboardPathForProfile(profile);
      }

      // Respect the deployment host behind Vercel's proxy.
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocal = process.env.NODE_ENV === 'development';
      if (isLocal) return NextResponse.redirect(`${origin}${dest}`);
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${dest}`);
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
