import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  }),
}));

/**
 * Testele nu au voie să atingă producția.
 *
 * `vitest` încarcă `.env.local`, care conține exact cheile reale: URL-ul bazei
 * de producție, `SUPABASE_SERVICE_ROLE_KEY` (ocolește RLS), `NEXT_PUBLIC_APP_URL`
 * (producția) și `CRON_SECRET`. Câteva teste vechi construiesc singure clienți
 * Supabase din `process.env` și fac zeci de scrieri; altele fac `fetch` către
 * `NEXT_PUBLIC_APP_URL`, iar `tests/notification-flow/integration/cron-endpoint`
 * chiar face `POST /api/cron/process-reminders` cu `Bearer ${CRON_SECRET}`.
 *
 * Adică `npm test` putea declanșa cronul real de remindere: SMS-uri trimise mai
 * devreme, marcate ca trimise, iar rularea de dimineață ar fi sărit peste acei
 * clienți. Verificat pe 2026-08-09: nu s-a întâmplat, dar doar pentru că în ziua
 * aceea nu era niciun reminder scadent — noroc de calendar, nu barieră.
 *
 * URL-ul de Supabase era deja înlocuit aici, ceea ce ne-a salvat de scrierile în
 * bază. Restul nu era. Acum sunt toate.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.NOTIFYHUB_URL = 'http://localhost:9999';
process.env.NOTIFYHUB_API_KEY = 'test-notifyhub-key';
process.env.UITDEITP_PARTNER_API_KEY = 'test-partner-key';
