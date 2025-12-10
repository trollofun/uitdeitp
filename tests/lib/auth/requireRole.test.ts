import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUserRole, requireRole, requireAdmin } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('getUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user role from database', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const role = await getUserRole();

    expect(role).toBe('admin');
    expect(mockSupabase.from).toHaveBeenCalledWith('user_roles');
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  });

  it('should return null for non-existent user', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'User not found' },
        }),
      },
      from: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const role = await getUserRole();

    expect(role).toBeNull();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should return null when role query fails', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Role not found' },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const role = await getUserRole();

    expect(role).toBeNull();
  });

  it('should handle database connection errors gracefully', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      },
      from: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const role = await getUserRole();

    expect(role).toBeNull();
  });
});

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow access for correct role', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await requireRole(['admin', 'station_manager']);

    expect(redirect).not.toHaveBeenCalled();
  });

  it('should redirect for incorrect role', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await requireRole(['admin']);

    expect(redirect).toHaveBeenCalledWith('/unauthorized');
  });

  it('should redirect unauthenticated users to login', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
      from: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await requireRole(['admin']);

    expect(redirect).toHaveBeenCalledWith('/auth/login');
  });

  it('should allow multiple roles', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'station_manager' },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await requireRole(['admin', 'station_manager']);

    expect(redirect).not.toHaveBeenCalled();
  });

  it('should handle case-insensitive role matching', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'ADMIN' },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await requireRole(['admin']);

    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow admin access', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await requireAdmin();

    expect(redirect).not.toHaveBeenCalled();
  });

  it('should block non-admin users', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'station_manager' },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await requireAdmin();

    expect(redirect).toHaveBeenCalledWith('/unauthorized');
  });

  it('should block regular users', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await requireAdmin();

    expect(redirect).toHaveBeenCalledWith('/unauthorized');
  });

  it('should redirect unauthenticated users to login', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
      from: vi.fn(),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    await requireAdmin();

    expect(redirect).toHaveBeenCalledWith('/auth/login');
  });
});
