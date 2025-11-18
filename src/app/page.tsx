import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { HowItWorks } from '@/components/home/HowItWorks';
import { TrustSignals } from '@/components/home/TrustSignals';
import { ArrowRight, Bell, AlertTriangle } from 'lucide-react';

/**
 * Homepage - Redesigned for Maximum Google Sign-In Conversion
 *
 * Design Strategy:
 * - Gestalt Law of Prägnanz: Maximum simplicity, clear hierarchy
 * - Psychological Triggers: Urgency + Simplicity
 * - Primary CTA: Google Sign-In (largest, most prominent)
 * - Visual Hierarchy: Hero > Google CTA > Flow > Trust
 *
 * Conversion Optimization:
 * - Urgency messaging: "Nu mai uita de ITP!"
 * - Simplicity promise: "3 pași simpli"
 * - Social proof: "1000+ șoferi"
 * - Risk reversal: "100% Gratuit"
 */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Hero Section - Maximum Visual Impact */}
      <section className="relative overflow-hidden border-b bg-card/50 backdrop-blur-sm">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

        <div className="max-w-5xl mx-auto px-4 py-20 sm:py-32">
          <div className="text-center space-y-8">
            {/* Urgency Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-full text-orange-700 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              <span>Peste 50.000 de șoferi uită anual de ITP</span>
            </div>

            {/* Main Headline - Urgency + Promise */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                Nu mai uita de ITP!
              </h1>
              <p className="text-2xl sm:text-3xl text-muted-foreground font-medium">
                Primești reminder automat prin SMS
              </p>
            </div>

            {/* Subheadline - Simplicity Promise */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              <strong className="text-foreground">3 pași simpli:</strong> Conectare cu Google → Verificare Telefon → Adaugă Mașina
            </p>

            {/* Primary CTA - Google Sign-In (Highest Visual Weight) */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <GoogleSignInButton
                redirectTo="/dashboard/verify-phone"
                className="w-full sm:w-auto text-lg px-10 py-7 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white border-2 border-primary/20"
              />

              {/* Secondary CTA - Email Registration */}
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full text-lg px-10 py-7"
                >
                  Sau creează cont cu email
                </Button>
              </Link>
            </div>

            {/* Trust Indicator - Below CTA */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Bell className="w-4 h-4 text-green-600" />
              <span>Deja folosit de <strong className="text-foreground">1.000+ șoferi</strong> din România</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals Bar */}
      <TrustSignals />

      {/* How It Works - 3-Step Flow */}
      <HowItWorks />

      {/* Benefits Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              De ce uitdeITP?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Sistemul tău personal de reminder-e ITP, RCA și Roviniete
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-3">Notificări Multi-Canal</h3>
              <p className="text-muted-foreground">
                Primești reminder-e prin <strong>SMS și Email</strong> la intervalele pe care le alegi tu (1, 5 sau 14 zile înainte).
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold mb-3">Control Total</h3>
              <p className="text-muted-foreground">
                Tu decizi când primești notificările. <strong>Maxim 3 reminder-e</strong> pe vehicul pentru a evita spam-ul.
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🚗</div>
              <h3 className="text-xl font-semibold mb-3">Mai Multe Vehicule</h3>
              <p className="text-muted-foreground">
                Adaugă <strong>câte mașini vrei</strong>. Configurare separată pentru ITP, RCA și Roviniete.
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-3">Sigur & Privat</h3>
              <p className="text-muted-foreground">
                Datele tale sunt protejate <strong>conform GDPR</strong>. Poți șterge contul oricând.
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">💯</div>
              <h3 className="text-xl font-semibold mb-3">100% Gratuit</h3>
              <p className="text-muted-foreground">
                Serviciu <strong>complet gratuit</strong>, fără costuri ascunse și fără publicitate.
              </p>
            </div>

            <div className="bg-card border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3">Setup Rapid</h3>
              <p className="text-muted-foreground">
                Te configurezi în <strong>mai puțin de 2 minute</strong>. Fără formulare complicate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24 bg-primary/5 border-y">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Gata să începi?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Alătură-te celor <strong>1.000+ șoferi</strong> care nu mai uită niciodată când expiră ITP-ul
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <GoogleSignInButton
              redirectTo="/dashboard/verify-phone"
              className="w-full sm:w-auto text-lg px-10 py-7 shadow-lg hover:shadow-xl transition-all bg-white"
            />

            <Link href="/auth/register" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full text-lg px-10 py-7">
                Creează cont cu email
              </Button>
            </Link>
          </div>

          {/* Alternative Entry Point - Kiosk Mode (Tertiary) */}
          <div className="mt-12 pt-8 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              Ești la o stație ITP parteneră?
            </p>
            <Link href="/kiosk">
              <Button variant="ghost" size="sm">
                Înregistrare rapidă la kiosk
                <ArrowRight className="ml-2 w-4 h-4" />
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
                  <Link href="/auth/login" className="text-muted-foreground hover:text-primary">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register" className="text-muted-foreground hover:text-primary">
                    Înregistrare
                  </Link>
                </li>
                <li>
                  <Link href="/kiosk" className="text-muted-foreground hover:text-primary">
                    Kiosk Mode
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
