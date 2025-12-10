import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { MapPin, Plus, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Gestionare Stații - uitdeITP',
  description: 'Gestionează stațiile ITP',
};

export default async function StationsManagePage() {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user is station manager or admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'station_manager' && profile.role !== 'admin')) {
    redirect('/unauthorized');
  }

  // Fetch stations
  const { data: stations } = await supabase
    .from('kiosk_stations')
    .select('*')
    .order('name');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🏢 Gestionare Stații ITP</h1>
              <p className="text-sm text-muted-foreground">
                Administrare stații și kiosk-uri
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              {profile.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Stațiile tale</h2>
          <div className="flex gap-2">
            <Link href="/stations/add-reminder">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adaugă Reminder Manual
              </Button>
            </Link>
            <Button disabled className="opacity-50 cursor-not-allowed">
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Stație (Coming soon)
            </Button>
          </div>
        </div>

        {/* Stations List */}
        {!stations || stations.length === 0 ? (
          <div className="bg-card border rounded-lg p-12 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-xl font-semibold mb-2">Nu există stații înregistrate</h3>
            <p className="text-muted-foreground mb-6">
              Contactează administratorul pentru a adăuga prima stație
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stations.map((station) => (
              <div key={station.id} className="bg-card border rounded-lg overflow-hidden">
                <div
                  className={`h-2 ${station.is_active ? 'bg-green-500' : 'bg-gray-400'}`}
                />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{station.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">
                          /{station.slug}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        station.is_active
                          ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {station.is_active ? 'Activ' : 'Inactiv'}
                    </span>
                  </div>

                  {station.address && (
                    <div className="mb-3">
                      <p className="text-sm text-muted-foreground">📍 {station.address}</p>
                    </div>
                  )}

                  {station.description && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">
                        {station.description}
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">URL Kiosk:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        /kiosk/{station.slug}
                      </code>
                    </div>

                    {station.phone && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Telefon:</span>
                        <span className="font-medium">{station.phone}</span>
                      </div>
                    )}

                    {station.email && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium">{station.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link href={`/kiosk/${station.slug}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Vezi Kiosk
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      Editează
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
            💡 Cum funcționează kiosk-ul?
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 ml-4 list-disc">
            <li>
              Fiecare stație are un URL unic: <code>/kiosk/[slug]</code>
            </li>
            <li>
              Clienții pot scana un QR code sau accesa direct URL-ul pentru a se înregistra
            </li>
            <li>
              Procesul include: verificare telefon → număr înmatriculare → data expirare →
              consimțământ
            </li>
            <li>Reminder-ele sunt trimise automat cu 30 și 7 zile înainte de expirare</li>
            <li>
              Toate datele sunt stocate securizat și conform GDPR
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
