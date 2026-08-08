/**
 * The station area had no layout at all — no header, no navigation, no way
 * out. You landed on /stations/dashboard only if you knew the URL by heart,
 * and once there nothing told you where you were or how to leave.
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getUserContexts } from '@/lib/auth/contexts';
import { AppHeader } from '@/components/layout/AppHeader';
import { StationNav } from '@/components/stations/StationNav';

export const dynamic = 'force-dynamic';

export default async function StationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const contexts = await getUserContexts(supabase, user.id, '/stations');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader initial={contexts} />
      <StationNav />
      <main>{children}</main>
    </div>
  );
}
