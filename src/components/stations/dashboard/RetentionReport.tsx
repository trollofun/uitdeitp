'use client';

/**
 * Clienții care n-au mai revenit.
 *
 * SOGA are raportul ăsta ca listă. Diferența e că al nostru se termină într-un
 * buton de telefon: un raport pe care nu poți acționa e o statistică, nu un
 * instrument.
 *
 * Onest despre ce nu știe: fără VIN nu putem distinge „a mers în altă parte" de
 * „și-a vândut mașina" sau „circulă fără ITP". Scrie asta pe ecran, ca nimeni să
 * nu construiască o decizie pe o certitudine pe care n-o avem.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, PhoneCall, Info, Check } from 'lucide-react';

interface LostClient {
  plate_number: string;
  guest_name: string | null;
  guest_phone: string | null;
  expired_at: string;
  days_overdue: number;
  last_visit: string | null;
}

export function RetentionReport() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<LostClient[]>([]);
  const [called, setCalled] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/stations/me/retention')
      .then((r) => r.json())
      .then((json) => setClients(json?.data?.clients ?? []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border bg-card p-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Clienți care nu s-au mai întors</h2>

      {clients.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-green-700 dark:text-green-500">
          <Check className="h-4 w-4" />
          Niciunul. Toți clienții cu ITP expirat au revenit.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">
            <strong>{clients.length}</strong>{' '}
            {clients.length === 1 ? 'client cu ITP expirat' : 'clienți cu ITP expirat'} care nu
            au mai trecut pe la tine. Cei mai vechi sunt primii — sună-i pe cei de sus.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr className="border-b">
                  <th className="pb-2 pr-4 font-medium">Mașină</th>
                  <th className="pb-2 pr-4 font-medium">Client</th>
                  <th className="pb-2 pr-4 font-medium">A expirat</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const key = `${c.plate_number}-${c.expired_at}`;
                  const done = called.has(key);
                  return (
                    <tr key={key} className={`border-b last:border-0 ${done ? 'opacity-50' : ''}`}>
                      <td className="py-2 pr-4 font-mono">{c.plate_number}</td>
                      <td className="py-2 pr-4">{c.guest_name ?? '—'}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {c.days_overdue} {c.days_overdue === 1 ? 'zi' : 'zile'}
                      </td>
                      <td className="py-2">
                        {c.guest_phone ? (
                          <a
                            href={`tel:${c.guest_phone}`}
                            onClick={() => setCalled((s) => new Set(s).add(key))}
                            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 hover:bg-accent"
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                            {c.guest_phone}
                          </a>
                        ) : (
                          <span className="text-gray-500">fără telefon</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Limita raportului, scrisă pe ecran. Vine din faptul că azi nu avem VIN. */}
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-sm text-gray-600">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          Lista arată cine <strong>nu a revenit la tine</strong>. Nu putem ști încă dacă a mers
          în altă parte, și-a vândut mașina sau circulă fără ITP — pentru asta ne trebuie seria
          de șasiu de la SIRAR, pe care am cerut-o.
        </span>
      </p>
    </section>
  );
}
