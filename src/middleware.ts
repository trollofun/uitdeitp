import { updateSession } from '@/lib/auth/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { appUrl } from '@/lib/config/app-url';
import { shortUrl, isShortPath, bareOptOutToken } from '@/lib/config/short-url';

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
 * **Corectură.** Comentariul de aici a susținut o vreme că forma
 * `NextResponse.next({ request: { headers } })` din `updateSession` e cea care
 * transformă `notFound()` în 200. Nu era adevărat, iar acum e probat: cu
 * bypass-ul scos, deci trecând prin `updateSession`, `/statii/zz` întoarce 404
 * curat. Vinovatul era `src/app/loading.tsx` de la rădăcină — vezi
 * `not-found.tsx`.
 *
 * Bypass-ul rămâne, dar pentru motivul lui adevărat, care e mai modest:
 * economisește un drum la Supabase (`auth.getUser`) pe fiecare vizitare a unei
 * pagini publice. Pentru un director indexat de motoare de căutare, unde
 * majoritatea traficului e anonim, merită.
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

    // `itp.vin/xxxxxx` — linkul de opt-out în forma lui cea mai scurtă
    // (14 caractere în SMS). Rewrite intern spre pagina existentă /o, fără
    // redirect: pagina rămâne o singură implementare, iar clientul nu face
    // un drum în plus pe conexiune mobilă.
    const optOutToken = bareOptOutToken(pathname);
    if (optOutToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/o';
      url.search = `?t=${optOutToken}`;
      return NextResponse.rewrite(url);
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
