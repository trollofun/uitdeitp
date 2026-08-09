import { updateSession } from '@/lib/auth/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { appUrl } from '@/lib/config/app-url';
import { shortUrl, isShortPath } from '@/lib/config/short-url';

/**
 * Next.js Middleware
 * Handles authentication, session refresh, and route protection
 *
 * Protected routes:
 * - /dashboard/* - Requires authenticated user
 * - /admin/* - Requires admin role
 * - /stations/manage - Requires station_manager or admin role
 *
 * Public routes:
 * - /kiosk/* - Public kiosk interface
 * - /auth/* - Authentication pages
 * - / - Homepage
 *
 * Plus, de la 2026-08-09: domeniul scurt `itp.vin`, care servește **doar**
 * linkurile din SMS. Orice altceva pleacă spre domeniul canonic.
 */
export async function middleware(request: NextRequest) {
  const shortHost = new URL(shortUrl()).host;
  const requestHost = request.headers.get('host');

  if (shortHost && requestHost === shortHost && shortHost !== new URL(appUrl()).host) {
    const { pathname, search } = request.nextUrl;

    // `itp.vin/p/euro-auto` → pagina de programare, fără redirect: un redirect
    // ar arunca economia de caractere înapoi în bara de adrese a clientului și
    // ar adăuga un drum în plus pe o conexiune mobilă.
    if (pathname.startsWith('/p/')) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/p\//, '/programare/');
      return NextResponse.rewrite(url);
    }

    if (isShortPath(pathname)) {
      // `/o` și `/r` există ca atare; le lăsăm să treacă fără sesiune.
      // Nu au nevoie de auth, iar `updateSession` ar seta cookie-uri pe host-ul
      // scurt — inutile acolo și confuze la depanare.
      return NextResponse.next();
    }

    // Restul: domeniul scurt nu e o a doua copie a aplicației. Redirect
    // permanent, ca motoarele de căutare să nu indexeze două variante și ca
    // nimeni să nu ajungă să folosească `itp.vin` ca adresă principală.
    return NextResponse.redirect(new URL(`${pathname}${search}`, appUrl()), 308);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/* (API routes - no auth needed)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
