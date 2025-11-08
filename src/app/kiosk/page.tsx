import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { MapPin, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Selectează Stația ITP - uitdeITP',
  description: 'Alege stația ITP pentru a te înregistra pentru reminder-e',
};

export default async function KioskSelectionPage() {
  const supabase = createServerClient();

  const { data: stations, error } = await supabase
    .from('kiosk_stations')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Error fetching stations:', error);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">🚗 uitdeITP</h1>
            <p className="text-muted-foreground">
              Selectează stația ITP pentru a primi reminder-e
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {!stations || stations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Nu există stații active momentan
            </h2>
            <p className="text-muted-foreground">
              Te rugăm să revii mai târziu sau să contactezi administratorul.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Stații ITP Disponibile</h2>
              <p className="text-muted-foreground">
                Găsite {stations.length} {stations.length === 1 ? 'stație' : 'stații'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stations.map((station) => (
                <Link
                  key={station.id}
                  href={`/kiosk/${station.slug}`}
                  className="group bg-card border rounded-lg p-6 hover:shadow-lg hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {station.name}
                        </h3>
                      </div>

                      {station.address && (
                        <p className="text-sm text-muted-foreground mb-3 ml-12">
                          📍 {station.address}
                        </p>
                      )}

                      {station.description && (
                        <p className="text-sm text-muted-foreground mb-3 ml-12">
                          {station.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 ml-12 mt-4">
                        <span className="text-sm font-medium text-primary group-hover:underline">
                          Începe înregistrarea
                        </span>
                        <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">📱</div>
            <h4 className="font-semibold mb-1">Verificare Telefon</h4>
            <p className="text-sm text-muted-foreground">
              Primești un cod SMS pentru verificare
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">🚗</div>
            <h4 className="font-semibold mb-1">Date Vehicul</h4>
            <p className="text-sm text-muted-foreground">
              Introduci numărul și data expirării ITP
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">⏰</div>
            <h4 className="font-semibold mb-1">Reminder-e Automate</h4>
            <p className="text-sm text-muted-foreground">
              Primești SMS cu 30 și 7 zile înainte
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-card/80 backdrop-blur-sm py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 uitdeITP - Reminder-e ITP Inteligente</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/termeni-si-conditii" className="hover:text-primary">
              Termeni și Condiții
            </Link>
            <span>•</span>
            <Link href="/politica-confidentialitate" className="hover:text-primary">
              Politica de Confidențialitate
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-primary">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
