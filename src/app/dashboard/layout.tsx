'use client';

import { useState, useEffect } from 'react';
import { redirect, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { PhoneNumberCheck } from '@/components/dashboard/PhoneNumberCheck';
import { AppHeader } from '@/components/layout/AppHeader';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createBrowserClient();

  // Check authentication on client side
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/auth/login';
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [supabase]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Phone Number Verification Check */}
      <PhoneNumberCheck />

      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* The switcher lives here rather than in the page body, so it survives
            navigation to /dashboard/reminders and the rest. The mobile menu
            button moved in with it — it used to float over the content. */}
        <AppHeader>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Deschide meniul"
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </AppHeader>

        <main className="flex-1 overflow-y-auto px-4 lg:px-0">{children}</main>
      </div>
    </div>
  );
}
