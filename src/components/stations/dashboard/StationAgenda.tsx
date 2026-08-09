'use client';

/**
 * Agenda stației.
 *
 * Fără ecranul ăsta, programările erau clienți invizibili: pagina publică scria
 * în `appointments`, nimeni nu citea tabela, iar omul se prezenta la o stație
 * care nu-l aștepta. Jumătatea publică fusese livrată fără jumătatea internă.
 *
 * Inspectorul vede ora, mașina și numele — atât cât să lucreze. Telefonul apare
 * doar patronului; filtrarea se face pe server, nu aici.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PhoneCall, CalendarDays, Check, X, UserX } from 'lucide-react';

interface Appointment {
  id: string;
  time: string;
  customer_name: string | null;
  customer_phone?: string | null;
  plate_number: string | null;
  status: 'booked' | 'completed' | 'cancelled' | 'no_show';
}

interface Day {
  date: string;
  appointments: Appointment[];
}

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
};

export function StationAgenda() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<Day[]>([]);
  const [role, setRole] = useState<'patron' | 'inspector'>('inspector');
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/stations/me/appointments?days=14')
      .then((r) => r.json())
      .then((json) => {
        setDays(json?.data?.days ?? []);
        setRole(json?.data?.role ?? 'inspector');
        setBookingEnabled(Boolean(json?.data?.booking_enabled));
      })
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const setStatus = async (id: string, status: Appointment['status']) => {
    setPending(id);
    try {
      const res = await fetch(`/api/stations/me/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast({
          title: 'Nu am putut actualiza',
          description: json?.error?.message ?? json?.error,
          variant: 'destructive',
        });
        return;
      }

      load();
    } finally {
      setPending(null);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border bg-card p-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarDays className="h-5 w-5" />
        Programări
      </h2>

      {!bookingEnabled && (
        // Distincția contează: „n-ai pornit funcția" e altceva decât „nimeni nu
        // s-a programat", iar al doilea mesaj l-ar face pe patron să creadă că
        // programările nu funcționează.
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Programările online sunt oprite. Pornește-le din Setări ca să primești
          rezervări din SMS-urile de expirare.
        </p>
      )}

      {days.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">
          {bookingEnabled ? 'Nicio programare în următoarele două săptămâni.' : ''}
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {days.map((day) => (
            <div key={day.date}>
              <p className="text-sm font-medium text-gray-600">{dayLabel(day.date)}</p>

              <ul className="mt-2 divide-y">
                {day.appointments.map((a) => (
                  <li
                    key={a.id}
                    className={`flex flex-wrap items-center gap-3 py-2 ${
                      a.status !== 'booked' ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="font-mono text-sm tabular-nums">{a.time}</span>

                    <span className="min-w-0 flex-1 text-sm">
                      {a.customer_name ?? 'Client'}
                      {a.plate_number && (
                        <span className="ml-2 font-mono text-gray-600">{a.plate_number}</span>
                      )}
                    </span>

                    {a.customer_phone && (
                      <a
                        href={`tel:${a.customer_phone}`}
                        className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm hover:bg-accent"
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        {a.customer_phone}
                      </a>
                    )}

                    {a.status === 'booked' ? (
                      <span className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending === a.id}
                          onClick={() => setStatus(a.id, 'completed')}
                          title="A venit"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending === a.id}
                          onClick={() => setStatus(a.id, 'no_show')}
                          title="Nu s-a prezentat"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        {role === 'patron' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending === a.id}
                            onClick={() => setStatus(a.id, 'cancelled')}
                            title="Anulează"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {a.status === 'completed' ? 'a venit' : 'nu s-a prezentat'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
