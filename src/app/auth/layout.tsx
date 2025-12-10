import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Autentificare - uitdeITP',
  description: 'Conectează-te sau creează un cont pentru a gestiona reminder-ele tale ITP',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">🚗 uitdeITP</h1>
            <p className="text-muted-foreground">
              Reminder-e ITP Inteligente
            </p>
          </div>

          {/* Main Content Card */}
          <div className="bg-card border rounded-lg shadow-lg p-8">
            {children}
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-sm text-muted-foreground">
            <p>© 2025 uitdeITP. Toate drepturile rezervate.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
