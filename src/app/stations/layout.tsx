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

  // Owner of a station, or a member with the patron role, gets the full nav.
  // An inspector gets a single screen and no links to places they cannot enter.
  const { data: owned } = await supabase
    .from('kiosk_stations')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1);

  let role: 'patron' | 'inspector' = 'patron';

  if (!owned?.[0]) {
    const { data: memberships } = await supabase
      .from('station_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (memberships?.[0]?.role === 'inspector') role = 'inspector';
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader initial={contexts} />
      <StationNav role={role} />
      <main>{children}</main>
    </div>
  );
}
