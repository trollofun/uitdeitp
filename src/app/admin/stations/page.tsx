import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { StationsTable } from '@/components/admin/StationsTable';
import { StationsTableSkeleton } from '@/components/admin/StationsTableSkeleton';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Stații | Admin Panel',
  description: 'Gestionare stații ITP',
};

async function StationsData() {
  const supabase = createClient();

  // Fetch all stations with reminder counts
  const { data: stations, error } = await supabase
    .from('kiosk_stations')
    .select(`
      id,
      slug,
      name,
      logo_url,
      primary_color,
      station_phone,
      station_address,
      is_active,
      created_at,
      reminders:reminders(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching stations:', error);
    return <div className="text-error">Eroare la încărcarea stațiilor</div>;
  }

  // Transform data to include reminder count
  const stationsWithCounts = stations.map((station) => ({
    ...station,
    reminder_count: Array.isArray(station.reminders) ? station.reminders.length : 0,
  }));

  return <StationsTable stations={stationsWithCounts} />;
}

export default function StationsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stații ITP</h1>
          <p className="text-muted-foreground mt-2">
            Gestionează stațiile și configurează branding-ul pentru kiosk
          </p>
        </div>
        <Link href="/admin/stations/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Adaugă Stație
          </Button>
        </Link>
      </div>

      {/* Stations Table */}
      <Suspense fallback={<StationsTableSkeleton />}>
        <StationsData />
      </Suspense>
    </div>
  );
}
