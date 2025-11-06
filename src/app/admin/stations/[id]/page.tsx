import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StationForm } from '@/components/admin/StationForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Editează Stație | Admin Panel',
  description: 'Modifică setările stației ITP',
};

async function getStation(id: string) {
  const supabase = createClient();

  const { data: station, error } = await supabase
    .from('kiosk_stations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !station) {
    return null;
  }

  return station;
}

export default async function EditStationPage({
  params,
}: {
  params: { id: string };
}) {
  const station = await getStation(params.id);

  if (!station) {
    notFound();
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/stations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editează Stație</h1>
          <p className="text-muted-foreground mt-2">
            Modifică setările pentru {station.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <StationForm station={station} />
    </div>
  );
}
