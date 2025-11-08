'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function KioskError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Kiosk error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Eroare Kiosk</h1>
          <p className="text-muted-foreground">
            A apărut o problemă la încărcarea kiosk-ului
          </p>
        </div>

        {error.message && (
          <div className="bg-muted/50 border rounded-lg p-4 text-left">
            <p className="text-sm font-mono text-destructive">{error.message}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Încearcă din nou
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => (window.location.href = '/kiosk')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Lista Stații
          </Button>
        </div>
      </div>
    </div>
  );
}
