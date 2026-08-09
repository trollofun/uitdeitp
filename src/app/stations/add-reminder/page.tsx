import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { AddReminderForm } from '@/components/stations/AddReminderForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Adaugă Reminder - uitdeITP',
  description: 'Adaugă manual un reminder pentru un client',
};

export default async function AddReminderPage() {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user is station_manager or admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'station_manager' && profile.role !== 'admin')) {
    redirect('/unauthorized');
  }

  // Selectorul arăta **toate** stațiile active oricui avea rolul de manager.
  //
  // Nu era o gaură de securitate — ruta `POST /api/stations/add-reminder`
  // verifică proprietatea și întoarce 403 pentru o stație străină. Dar erau
  // două lucruri greșite: numele tuturor stațiilor se scurgeau către oricine
  // are cont de manager, iar cine alegea din listă o stație care nu e a lui
  // primea un 403 fără să înțeleagă de ce i s-a oferit opțiunea.
  //
  // Lista se filtrează acum ca ruta: managerul își vede stațiile, adminul pe
  // toate. Aceeași regulă în două locuri, nu una permisivă și una strictă.
  let stationsQuery = supabase
    .from('kiosk_stations')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (profile.role === 'station_manager') {
    stationsQuery = stationsQuery.eq('owner_id', user.id);
  }

  const { data: stations } = await stationsQuery;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">📋 Adaugă Reminder Manual</h1>
              <p className="text-sm text-muted-foreground">
                Înregistrează un client care nu are acces la kiosk
              </p>
            </div>
            <Link href="/stations/manage">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Înapoi
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AddReminderForm stations={stations || []} />
      </main>
    </div>
  );
}
