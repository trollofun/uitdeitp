'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">Ceva nu a mers bine</h1>
          <p className="text-muted-foreground">
            Ne pare rău, a apărut o eroare neașteptată
          </p>
        </div>

        {error.message && (
          <div className="bg-muted/50 border rounded-lg p-4 text-left">
            <p className="text-sm font-mono text-destructive">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2">
                Error ID: {error.digest}
              </p>
            )}
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
            onClick={() => (window.location.href = '/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Înapoi la Pagina Principală
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            Dacă problema persistă, te rugăm să ne contactezi la{' '}
            <a href="mailto:support@uitdeitp.ro" className="text-primary hover:underline">
              support@uitdeitp.ro
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
