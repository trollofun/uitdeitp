import { FAQ, FinalCTA, Footer } from '@/components/landing';

export default function LandingDemoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Spacer */}
      <div className="h-20 bg-background border-b border-border flex items-center justify-center">
        <h1 className="text-2xl font-bold">🚗 uitdeITP.ro</h1>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Placeholder */}
        <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Nu mai uita de ITP
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Primești SMS automat cu 30 de zile înainte să expire
            </p>
            <button className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">
              Începe acum
            </button>
          </div>
        </section>

        {/* Features Placeholder */}
        <section className="py-16 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-3xl font-bold text-center mb-12">
              De ce uitdeITP?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="text-4xl mb-4">📱</div>
                <h4 className="font-semibold mb-2">SMS Automat</h4>
                <p className="text-sm text-muted-foreground">
                  Primești reminder cu 30 zile înainte
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-4xl mb-4">🔒</div>
                <h4 className="font-semibold mb-2">Sigur & GDPR</h4>
                <p className="text-sm text-muted-foreground">
                  Datele tale sunt protejate
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-4xl mb-4">💰</div>
                <h4 className="font-semibold mb-2">Gratuit</h4>
                <p className="text-sm text-muted-foreground">
                  Până la 2 mașini, fără card
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* NEW COMPONENTS */}
        <FAQ />
        <FinalCTA />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
