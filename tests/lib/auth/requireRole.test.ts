/**
 * Testele erau scrise pentru o versiune veche a modulului:
 *
 *   - mocheau `createClient`, dar codul cheamă `createServerClient`. Sunt două
 *     exporturi ale aceleiași funcții (`export { createServerClient as
 *     createClient }`), dar automock-ul le dă mock-uri separate — deci cel
 *     configurat nu era cel apelat, iar codul primea `undefined`.
 *   - foloseau `mockResolvedValue` pentru o funcție **sincronă**.
 *   - chemau `getUserRole()` fără argument, deși semnătura cere `userId` și nu
 *     mai rezolvă utilizatorul singură.
 *
 * Rescrise pe implementarea reală.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserRole,
  requireRole,
  requireAdmin,
  requireStationManagerOrAdmin,
  hasRole,
  isAdmin,
} from '@/lib/auth/requireRole';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

vi.mock('@/lib/supabase/server');
vi.mock('next/navigation', () => ({
  // `redirect` aruncă în Next.js, ca să oprească execuția. Fără asta, codul de
  // după redirect ar continua în teste și am valida un flux imposibil.
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

/** Client Supabase fals: `user_profiles` întoarce rolul dat, auth întoarce userul dat. */
function mockClient(options: {
  role?: string | null;
  roleError?: unknown;
  user?: { id: string } | null;
  authError?: unknown;
}) {
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user ?? null },
        error: options.authError ?? null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: options.role === undefined ? null : { role: options.role },
            error: options.roleError ?? null,
          }),
        }),
      }),
    }),
  };

  // Sincron, ca funcția reală.
  vi.mocked(createServerClient).mockReturnValue(client as never);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getUserRole', () => {
  it('should return user role from database', async () => {
    mockClient({ role: 'admin' });
    expect(await getUserRole('user-123')).toBe('admin');
  });

  it('should query user_profiles by id', async () => {
    const client = mockClient({ role: 'user' });
    await getUserRole('user-123');
    expect(client.from).toHaveBeenCalledWith('user_profiles');
  });

  it('should return null for non-existent user', async () => {
    mockClient({ role: undefined });
    expect(await getUserRole('nobody')).toBeNull();
  });

  it('should return null when role query fails', async () => {
    mockClient({ role: undefined, roleError: { message: 'boom' } });
    expect(await getUserRole('user-123')).toBeNull();
  });
});

describe('requireRole', () => {
  it('should allow access for correct role', async () => {
    mockClient({ user: { id: 'user-123' }, role: 'admin' });

    const result = await requireRole(['admin']);

    expect(result.role).toBe('admin');
    expect(result.user).toEqual({ id: 'user-123' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('should allow any of several roles', async () => {
    mockClient({ user: { id: 'user-123' }, role: 'station_manager' });

    const result = await requireRole(['station_manager', 'admin']);
    expect(result.role).toBe('station_manager');
  });

  it('should redirect to /unauthorized for insufficient role', async () => {
    mockClient({ user: { id: 'user-123' }, role: 'user' });

    await expect(requireRole(['admin'])).rejects.toThrow('NEXT_REDIRECT:/unauthorized');
    expect(redirect).toHaveBeenCalledWith('/unauthorized');
  });

  it('should redirect unauthenticated users to login', async () => {
    mockClient({ user: null });

    await expect(requireRole(['admin'])).rejects.toThrow('NEXT_REDIRECT:/auth/login');
    expect(redirect).toHaveBeenCalledWith('/auth/login');
  });

  it('should redirect to login when auth itself errors', async () => {
    mockClient({ user: null, authError: { message: 'session expired' } });

    await expect(requireRole(['admin'])).rejects.toThrow('NEXT_REDIRECT:/auth/login');
  });

  it('should redirect when the profile has no role at all', async () => {
    mockClient({ user: { id: 'user-123' }, role: undefined });

    await expect(requireRole(['user'])).rejects.toThrow('NEXT_REDIRECT:/unauthorized');
  });

  it('should be case-sensitive about roles', async () => {
    // Rolurile sunt o mulțime închisă în baza de date; 'Admin' nu e 'admin'.
    mockClient({ user: { id: 'user-123' }, role: 'Admin' });

    await expect(requireRole(['admin'])).rejects.toThrow('NEXT_REDIRECT:/unauthorized');
  });
});

describe('requireAdmin', () => {
  it('should allow admin access', async () => {
    mockClient({ user: { id: 'user-123' }, role: 'admin' });
    expect((await requireAdmin()).role).toBe('admin');
  });

  it('should reject a station manager', async () => {
    mockClient({ user: { id: 'user-123' }, role: 'station_manager' });
    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/unauthorized');
  });
});

describe('requireStationManagerOrAdmin', () => {
  it.each(['station_manager', 'admin'])('should allow %s', async (role) => {
    mockClient({ user: { id: 'user-123' }, role });
    expect((await requireStationManagerOrAdmin()).role).toBe(role);
  });

  it('should reject a plain user', async () => {
    mockClient({ user: { id: 'user-123' }, role: 'user' });
    await expect(requireStationManagerOrAdmin()).rejects.toThrow('NEXT_REDIRECT:/unauthorized');
  });
});

describe('hasRole / isAdmin', () => {
  it('should answer without redirecting', async () => {
    mockClient({ role: 'admin' });

    expect(await hasRole('user-123', ['admin'])).toBe(true);
    expect(await isAdmin('user-123')).toBe(true);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('should return false for a missing role', async () => {
    mockClient({ role: undefined });

    expect(await hasRole('nobody', ['admin'])).toBe(false);
    expect(await isAdmin('nobody')).toBe(false);
  });
});
