import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const metadata = {
  title: 'Acces Interzis - uitdeITP',
  description: 'Nu ai permisiunea să accesezi această pagină',
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">Acces Interzis</h1>
          <p className="text-muted-foreground">
            Nu ai permisiunea să accesezi această pagină
          </p>
        </div>

        <div className="bg-muted/50 border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Această pagină este accesibilă doar utilizatorilor cu permisiuni speciale.
            Dacă crezi că este o eroare, contactează administratorul.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/dashboard" className="w-full">
            <Button className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Înapoi la Dashboard
            </Button>
          </Link>

          <Link href="/" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Înapoi la Pagina Principală
            </Button>
          </Link>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>Cod eroare: 403 - Forbidden</p>
        </div>
      </div>
    </div>
  );
}
