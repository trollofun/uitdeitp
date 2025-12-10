/**
 * RBAC Client Protection Tests
 * Verifies role-based access control for client-side components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RoleGuard, AdminGuard, StationManagerGuard } from '@/components/guards/RoleGuard';
import { useRequireRole } from '@/hooks/useRequireRole';

// Mock the useRequireRole hook
vi.mock('@/hooks/useRequireRole', () => ({
  useRequireRole: vi.fn(),
  useRequireAdmin: vi.fn(),
  useRequireStationManagerOrAdmin: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('RoleGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state while checking permissions', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: true,
      isAuthorized: false,
      userRole: null,
    });

    render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render children when user is authorized', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: true,
      userRole: 'admin',
    });

    render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should not render children when user is not authorized', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      userRole: 'user',
    });

    render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render custom loading component when provided', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: true,
      isAuthorized: false,
      userRole: null,
    });

    render(
      <RoleGuard
        allowedRoles={['admin']}
        loadingComponent={<div>Custom Loading...</div>}
      >
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
  });

  it('should render fallback when user is not authorized', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      userRole: 'user',
    });

    render(
      <RoleGuard
        allowedRoles={['admin']}
        fallback={<div>Access Denied</div>}
      >
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});

describe('AdminGuard Component', () => {
  it('should only allow admin role', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: true,
      userRole: 'admin',
    });

    render(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
    expect(useRequireRole).toHaveBeenCalledWith(['admin']);
  });

  it('should block non-admin users', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      userRole: 'user',
    });

    render(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });
});

describe('StationManagerGuard Component', () => {
  it('should allow station_manager role', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: true,
      userRole: 'station_manager',
    });

    render(
      <StationManagerGuard>
        <div>Manager Content</div>
      </StationManagerGuard>
    );

    expect(screen.getByText('Manager Content')).toBeInTheDocument();
    expect(useRequireRole).toHaveBeenCalledWith(['station_manager', 'admin']);
  });

  it('should allow admin role', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: true,
      userRole: 'admin',
    });

    render(
      <StationManagerGuard>
        <div>Manager Content</div>
      </StationManagerGuard>
    );

    expect(screen.getByText('Manager Content')).toBeInTheDocument();
  });

  it('should block regular users', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      userRole: 'user',
    });

    render(
      <StationManagerGuard>
        <div>Manager Content</div>
      </StationManagerGuard>
    );

    expect(screen.queryByText('Manager Content')).not.toBeInTheDocument();
  });
});

describe('Role-based Authorization Flow', () => {
  it('should handle role checking lifecycle correctly', async () => {
    const { rerender } = render(
      <RoleGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    // Initial loading state
    (useRequireRole as any).mockReturnValue({
      isLoading: true,
      isAuthorized: false,
      userRole: null,
    });

    rerender(
      <RoleGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    // After authorization check
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: true,
      userRole: 'admin',
    });

    rerender(
      <RoleGuard allowedRoles={['admin']}>
        <div>Protected Content</div>
      </RoleGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should support multiple allowed roles', () => {
    (useRequireRole as any).mockReturnValue({
      isLoading: false,
      isAuthorized: true,
      userRole: 'station_manager',
    });

    render(
      <RoleGuard allowedRoles={['station_manager', 'admin']}>
        <div>Multi-Role Content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Multi-Role Content')).toBeInTheDocument();
  });
});
