import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Car, Bell, Shield, Smartphone, Calendar, MapPin } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Hero Section */}
      <section className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center space-y-8">
            <div className="inline-block">
              <h1 className="text-5xl sm:text-6xl font-bold mb-4">
                🚗 uitdeITP
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground">
                Reminder-e ITP Inteligente
              </p>
            </div>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Nu mai uita niciodată când expiră ITP-ul! Primești notificări automate
              prin SMS cu 30 și 7 zile înainte de expirare.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/kiosk">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                  Înregistrează Vehiculul
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                  Conectare Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Cum funcționează?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Un proces simplu în 3 pași pentru a nu mai uita niciodată când expiră ITP-ul
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-card border rounded-lg p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <div className="text-4xl font-bold text-primary mb-2">1</div>
              <h3 className="text-xl font-semibold mb-3">Verificare Telefon</h3>
              <p className="text-muted-foreground">
                Introduci numărul de telefon și primești un cod SMS de verificare
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-card border rounded-lg p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-primary" />
              </div>
              <div className="text-4xl font-bold text-primary mb-2">2</div>
              <h3 className="text-xl font-semibold mb-3">Date Vehicul</h3>
              <p className="text-muted-foreground">
                Completezi numărul de înmatriculare și data expirării ITP-ului
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-card border rounded-lg p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-primary" />
              </div>
              <div className="text-4xl font-bold text-primary mb-2">3</div>
              <h3 className="text-xl font-semibold mb-3">Reminder-e Automate</h3>
              <p className="text-muted-foreground">
                Primești SMS cu 30 și 7 zile înainte de expirare. Complet automat!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              De ce uitdeITP?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card border rounded-lg p-6">
              <Calendar className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Gratuit 100%</h3>
              <p className="text-sm text-muted-foreground">
                Serviciu complet gratuit, fără costuri ascunse
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <Shield className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Sigur & Privat</h3>
              <p className="text-sm text-muted-foreground">
                Datele tale sunt protejate conform GDPR
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <Smartphone className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Notificări SMS</h3>
              <p className="text-sm text-muted-foreground">
                Primești reminder-e direct pe telefon
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6">
              <MapPin className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-semibold mb-2">Stații Partenere</h3>
              <p className="text-sm text-muted-foreground">
                Înregistrare rapidă la stațiile ITP partenere
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Gata să începi?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Înregistrează-te acum și nu mai uita niciodată când expiră ITP-ul
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/kiosk">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                Înregistrează Vehiculul Acum
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                Creează Cont Gratuit
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/80 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-3">uitdeITP</h3>
              <p className="text-sm text-muted-foreground">
                Platforma inteligentă pentru reminder-e ITP, RCA și Roviniete
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Link-uri Rapide</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/kiosk" className="text-muted-foreground hover:text-primary">
                    Înregistrare Vehicul
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="text-muted-foreground hover:text-primary">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register" className="text-muted-foreground hover:text-primary">
                    Creează Cont
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/termeni-si-conditii" className="text-muted-foreground hover:text-primary">
                    Termeni și Condiții
                  </Link>
                </li>
                <li>
                  <Link href="/politica-confidentialitate" className="text-muted-foreground hover:text-primary">
                    Politica de Confidențialitate
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 uitdeITP. Toate drepturile rezervate.</p>
            <p className="mt-2">
              Versiune 2.0 - Powered by Next.js & Supabase
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
