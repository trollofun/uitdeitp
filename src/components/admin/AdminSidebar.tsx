'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Building2,
  Bell,
  Coins,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ListChecks,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth/actions';
import { useState } from 'react';

const navigation = [
  { name: 'Stații', href: '/admin/stations', icon: Building2 },
  // Pagina exista de la început, dar nu era în meniu — se ajungea la ea
  // doar dintr-un card de pe /admin.
  { name: 'Utilizatori', href: '/admin/users', icon: Users },
  { name: 'Reminder-uri', href: '/admin/reminders', icon: ListChecks },
  { name: 'Credite', href: '/admin/credite', icon: Coins },
  { name: 'Notificări', href: '/admin/notifications', icon: Bell },
  { name: 'Analiză', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Setări', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // logout() se ocupă de redirect
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="fixed left-4 top-4 z-50 lg:hidden rounded-lg bg-card p-2 shadow-lg"
      >
        {collapsed ? <Menu className="h-6 w-6" /> : <X className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          'flex h-full flex-col border-r bg-card transition-all duration-300',
          collapsed ? '-ml-64 lg:ml-0 lg:w-20' : 'w-64',
          'fixed lg:relative z-40'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin" className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-primary" />
            {!collapsed && <span className="text-xl font-bold">Admin Panel</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center' : 'space-x-3',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="h-5 w-5" />
            {!collapsed && <span className="ml-3">Restrânge</span>}
          </Button>
        </div>

        {/* Logout */}
        <div className="border-t p-4">
          {/* Posta către /auth/signout, rută care n-a existat niciodată — deci
              butonul dădea 404 de când a fost scris. Folosește acum aceeași
              acțiune de server ca meniul șoferului: o singură implementare de
              deconectare, care se ocupă și de redirect. */}
          <Button
            variant="ghost"
            className={cn('w-full', collapsed ? 'justify-center' : 'justify-start')}
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={collapsed ? 'Deconectare' : undefined}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && (
              <span className="ml-3">{isLoggingOut ? 'Se deconectează…' : 'Deconectare'}</span>
            )}
          </Button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
