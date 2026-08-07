/**
 * The app's public base URL, normalised.
 *
 * NEXT_PUBLIC_APP_URL is typed by hand into a dashboard, so it arrives with a
 * trailing slash sooner or later. That produced `https://host//auth/callback`,
 * which Supabase would not match against its allow-list, so Google sign-in
 * silently bounced users to the site root instead of the dashboard. The same
 * value builds the opt-out link printed in SMS, where a broken URL is a GDPR
 * problem rather than an annoyance.
 *
 * Always go through this instead of reading the env var directly.
 */

const FALLBACK = 'https://www.uitdeitp.ro';

export function appUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return FALLBACK;
  return raw.replace(/\/+$/, '');
}

/** Absolute URL for a path, e.g. appPath('/auth/callback'). */
export function appPath(path: string): string {
  return `${appUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
