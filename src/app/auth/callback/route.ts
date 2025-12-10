import { createServerClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * OAuth Callback Route Handler
 *
 * Gestionează callback-ul după autentificare OAuth (Google)
 *
 * Flow:
 * 1. User se autentifică cu Google
 * 2. Provider redirect către /auth/callback?code=xxx
 * 3. Această rută schimbă code-ul pentru sesiune
 * 4. Redirect către destinație (dashboard)
 */

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  let next = requestUrl.searchParams.get('next') ?? '/dashboard';

  // Prevent open redirect vulnerability - ensure next starts with /
  if (!next.startsWith('/')) {
    next = '/dashboard';
  }

  // Handle OAuth errors from provider
  if (error) {
    logger.error('OAuth callback error from provider', {
      error,
      errorDescription,
      provider: requestUrl.searchParams.get('provider')
    });

    return NextResponse.redirect(
      new URL('/error?type=callback', requestUrl.origin)
    );
  }

  if (code) {
    try {
      const supabase = createServerClient();

      // Exchange authorization code for session
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        logger.error('Code exchange error', exchangeError);
        return NextResponse.redirect(
          new URL('/error?type=callback', requestUrl.origin)
        );
      }

      if (data.session) {
        // Successfully authenticated
        logger.info('User authenticated via OAuth', {
          userId: data.user.id,
          email: data.user.email,
          provider: data.user.app_metadata.provider
        });

        // Determine redirect URL based on environment
        const forwardedHost = request.headers.get('x-forwarded-host');
        const isLocalEnv = process.env.NODE_ENV === 'development';

        if (isLocalEnv) {
          return NextResponse.redirect(`${requestUrl.origin}${next}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          return NextResponse.redirect(`${requestUrl.origin}${next}`);
        }
      }
    } catch (error) {
      logger.error('Unexpected error in OAuth callback', error);
      return NextResponse.redirect(
        new URL('/error?type=callback', requestUrl.origin)
      );
    }
  }

  // No code found - likely an invalid callback
  logger.warn('OAuth callback accessed without code parameter');
  return NextResponse.redirect(
    new URL('/login', requestUrl.origin)
  );
}
