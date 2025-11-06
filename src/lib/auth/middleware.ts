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
  const stationManagerPaths = ['/stations/manage'];
  const isStationManagerRoute = stationManagerPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Auth routes (route group (auth) doesn't appear in URL)
  const authPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/callback'];
  const isAuthRoute = authPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  // Redirect logic
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
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

    const userRole = profile.role as 'user' | 'station_manager' | 'admin';

    // Check admin routes
    if (isAdminRoute && userRole !== 'admin') {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/unauthorized';
      return NextResponse.redirect(redirectUrl);
    }

    // Check station manager routes
    if (isStationManagerRoute && !['station_manager', 'admin'].includes(userRole)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/unauthorized';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
