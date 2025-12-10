'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function OptOutContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('t');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [alreadyOptedOut, setAlreadyOptedOut] = useState(false);

  // Check opt-out status on mount
  useEffect(() => {
    if (!token) {
      setError('Link invalid. Token lipsește.');
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/opt-out?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (data.success) {
          setPhone(data.phone);
          if (data.optedOut) {
            setAlreadyOptedOut(true);
            setSuccess(true);
          }
        }
      } catch (err) {
        console.error('Error checking opt-out status:', err);
      }
    };

    checkStatus();
  }, [token]);

  const handleOptOut = async () => {
    if (!token) {
      setError('Link invalid. Token lipsește.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/opt-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setAlreadyOptedOut(false); // Was newly opted out
      } else {
        setError(data.error || 'A apărut o eroare. Te rugăm să încerci din nou.');
      }
    } catch (err) {
      console.error('Opt-out error:', err);
      setError('A apărut o eroare de conexiune. Te rugăm să încerci din nou.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive" />
            <h1 className="text-2xl font-bold">Link Invalid</h1>
            <p className="text-muted-foreground">
              Link-ul de dezabonare este invalid sau a expirat.
            </p>
            <p className="text-sm text-muted-foreground">
              Dacă dorești să te dezabonezi de la notificări, te rugăm să accesezi link-ul din SMS-ul primit.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-success" />
            <h1 className="text-2xl font-bold">
              {alreadyOptedOut ? 'Deja Dezabonat' : 'Dezabonare Reușită'}
            </h1>
            {phone && (
              <p className="text-sm text-muted-foreground">
                Număr: {phone}
              </p>
            )}
            <p className="text-muted-foreground">
              {alreadyOptedOut
                ? 'Ești deja dezabonat de la notificările SMS.'
                : 'Ai fost dezabonat cu succes de la notificările SMS pentru expirarea ITP.'}
            </p>
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium">Informații importante:</p>
              <ul className="list-disc list-inside text-left text-muted-foreground space-y-1">
                <li>Nu vei mai primi SMS-uri de reminder pentru ITP</li>
                <li>Vei continua să primești email-uri (dacă ai cont înregistrat)</li>
                <li>Poți să te reabonezi oricând din setările contului tău</li>
              </ul>
            </div>
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="mt-4"
            >
              Înapoi la pagina principală
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center space-y-6">
          <AlertCircle className="h-16 w-16 text-warning" />

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Dezabonare Notificări SMS</h1>
            {phone && (
              <p className="text-sm text-muted-foreground">
                Număr: {phone}
              </p>
            )}
          </div>

          <p className="text-muted-foreground">
            Vrei să te dezabonezi de la notificările SMS pentru expirarea ITP?
          </p>

          <div className="bg-muted p-4 rounded-lg text-sm space-y-2 w-full">
            <p className="font-medium text-left">Ce se va întâmpla:</p>
            <ul className="list-disc list-inside text-left text-muted-foreground space-y-1">
              <li>Nu vei mai primi SMS-uri de reminder</li>
              <li>Vei putea să te reabonezi oricând</li>
              <li>Email-urile nu sunt afectate (dacă ai cont)</li>
            </ul>
          </div>

          {error && (
            <div className="w-full p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Anulează
            </Button>
            <Button
              onClick={handleOptOut}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Se procesează...
                </>
              ) : (
                'Confirmă Dezabonarea'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Conform GDPR, ai dreptul de a refuza primirea de mesaje promoționale sau informative.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function OptOutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OptOutContent />
    </Suspense>
  );
}
