'use client';

/**
 * `/a?t=<token>` — anularea programării, din SMS.
 *
 * Cale scurtă deliberat, ca `/o` și `/r`: intră în mesaj, deci fiecare caracter
 * costă. Pe domeniul scurt devine `itp.vin/a?t=…`, 28 de caractere.
 *
 * Un singur buton. Omul care anulează e într-un moment în care s-a răzgândit
 * sau nu poate ajunge; orice pas în plus îl face să nu mai anuleze deloc, iar
 * ora rămâne blocată pentru altcineva.
 */

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Check, CalendarX } from 'lucide-react';

function CancelContent() {
  const token = useSearchParams().get('t');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ cancelled_for: string; station: { name?: string; phone?: string | null } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch('/api/booking/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? 'Nu am putut anula programarea');
        return;
      }

      setDone(json.data);
    } catch {
      setError('Eroare de rețea. Încearcă din nou.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return <p className="text-gray-600">Link invalid.</p>;
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-900/50 dark:bg-green-950/30">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-green-900 dark:text-green-200">
          <Check className="h-5 w-5" />
          Programare anulată
        </h1>
        <p className="mt-2 text-green-900 dark:text-green-200">
          Ora de <strong>{done.cancelled_for}</strong> e liberă acum.
        </p>
        {done.station.phone && (
          <p className="mt-3 text-sm text-green-800 dark:text-green-300">
            Când vrei să revii, sună la{' '}
            <a href={`tel:${done.station.phone}`} className="font-medium underline">
              {done.station.phone}
            </a>{' '}
            sau programează-te din nou online.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h1 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarX className="h-5 w-5" />
        Anulezi programarea?
      </h1>
      <p className="mt-2 text-gray-600">
        Ora se eliberează imediat pentru altcineva. Poți face oricând o programare nouă.
      </p>

      {error && <p className="mt-3 text-sm text-amber-600 dark:text-amber-500">{error}</p>}

      <Button onClick={cancel} disabled={busy} variant="outline" className="mt-4">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da, anulează'}
      </Button>
    </div>
  );
}

export default function CancelPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-gray-400" />}>
        <CancelContent />
      </Suspense>
    </main>
  );
}
