import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Auth middleware for Next.js
 * Protects routes and refreshes sessions
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  const protectedPaths = ['/dashboard', '/reminders', '/profile', '/settings'];
  const isProtectedRoute = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Admin-only routes - require admin role
  const adminPaths = ['/admin'];
  const isAdminRoute = adminPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Station manager routes - require station_manager or admin role
  const stationManagerPaths = ['/stations/manage', '/stations/dashboard'];
  const isStationManagerRoute = stationManagerPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Auth routes
  const authPaths = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const isAuthRoute = authPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  // Redirect logic.
  //
  // `/admin` și `/stations` intră aici, nu doar în verificarea de rol de mai
  // jos: aceea rulează numai când `user` există, deci un vizitator anonim
  // ajungea până în layout, unde `requireAdmin()` chema `redirect()`. Un
  // redirect din layout e corect ca intenție, dar mai fragil ca mecanism —
  // exact el s-a transformat în `<meta refresh>` cu status 200 cât timp exista
  // `loading.tsx` la rădăcină. Oprit din marginea aplicației, e un 307 real,
  // fără randare inutilă.
  if ((isProtectedRoute || isAdminRoute || isStationManagerRoute) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    redirectUrl.pathname = redirectTo;
    redirectUrl.search = ''; // Clear query params
    return NextResponse.redirect(redirectUrl);
  }

  // Role-based access control
  if ((isAdminRoute || isStationManagerRoute) && user) {
    // Fetch user role from database
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/unauthorized';
      return NextResponse.redirect(redirectUrl);
    }

    const userRole = profile.role as 'user' | 'station_manager' | 'admin' | 'inspector';

    // Check admin routes
    if (isAdminRoute && userRole !== 'admin') {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/unauthorized';
      return NextResponse.redirect(redirectUrl);
    }

    // Check station manager routes.
    // 'inspector' is a station role too — a narrower one. The pages themselves
    // decide what an inspector sees; this only decides who gets through the
    // door.
    if (
      isStationManagerRoute &&
      !['station_manager', 'admin', 'inspector'].includes(userRole)
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/unauthorized';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
