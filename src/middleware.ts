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

/**
 * Pagini publice care nu au nevoie de sesiune.
 *
 * Nu sunt doar o optimizare. `updateSession` întoarce
 * `NextResponse.next({ request: { headers } })`, iar cu forma aceea orice
 * pagină care cheamă `notFound()` ajunge servită cu status **200** în loc de
 * 404 — „soft 404". Măsurat: `/statii/zz`, `/programare/nu-exista` și
 * `/kiosk/nu-exista` întorceau toate 200 cu conținut de 404, în timp ce o cale
 * complet inexistentă întorcea corect 404.
 *
 * Pentru un director public, asta înseamnă că Google ar indexa `/statii/zz` ca
 * pagină validă — exact ce încercam să prevenim validând codul de județ.
 * Kiosk-ul avea deja problema, dinaintea acestor pagini.
 */
const PUBLIC_PREFIXES = ['/statii', '/programare', '/kiosk', '/o', '/r', '/a', '/p/'];

const isPublicPage = (pathname: string): boolean =>
  PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const shortHost = new URL(shortUrl()).host;
  const requestHost = request.headers.get('host');

  if (shortHost && requestHost === shortHost && shortHost !== new URL(appUrl()).host) {
    // `itp.vin/p/euro-auto` → pagina de programare, fără redirect: un redirect
    // ar arunca economia de caractere înapoi în bara de adrese a clientului și
    // ar adăuga un drum în plus pe o conexiune mobilă.
    if (pathname.startsWith('/p/')) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/p\//, '/programare/');
      return NextResponse.rewrite(url);
    }

    if (isShortPath(pathname)) {
      return NextResponse.next();
    }

    // Restul: domeniul scurt nu e o a doua copie a aplicației. Redirect
    // permanent, ca motoarele de căutare să nu indexeze două variante și ca
    // nimeni să nu ajungă să folosească `itp.vin` ca adresă principală.
    return NextResponse.redirect(new URL(`${pathname}${search}`, appUrl()), 308);
  }

  // `NextResponse.next()` simplu, fără `{ request: { headers } }`: forma aceea
  // e cea care rupe statusul de la `notFound()`. Rutarea domeniului scurt de
  // mai sus rămâne intactă — de aceea excluderea se face aici, nu în matcher.
  if (isPublicPage(pathname)) {
    return NextResponse.next();
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
