import { updateSession } from '@/lib/auth/middleware';
import { type NextRequest } from 'next/server';

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
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
