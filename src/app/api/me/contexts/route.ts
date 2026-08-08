/**
 * GET /api/me/contexts — what this person has access to.
 *
 * Exists because /dashboard/layout.tsx is a client component that does its own
 * client-side auth; the header there cannot read the database directly. The
 * station area gets the same data server-side and never calls this.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getUserContexts, resolveLandingPath } from '@/lib/auth/contexts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pathname = new URL(req.url).searchParams.get('path') ?? '/dashboard';

  try {
    const contexts = await getUserContexts(supabase, user.id, pathname);
    // `landing` is what the client-side login page redirects to, so the two
    // login screens cannot drift apart from the server action.
    return NextResponse.json({
      ...contexts,
      landing: await resolveLandingPath(supabase),
    });
  } catch (error) {
    console.error('[Contexts] lookup failed:', error);
    // Never break the header over this: fall back to the personal context.
    return NextResponse.json({
      contexts: [{ kind: 'personal', label: 'Vehiculele mele', href: '/dashboard' }],
      current: { kind: 'personal', label: 'Vehiculele mele', href: '/dashboard' },
      role: 'user',
    });
  }
}
