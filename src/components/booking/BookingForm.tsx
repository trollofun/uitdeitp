'use client';

/**
 * Alegerea orei și rezervarea.
 *
 * Un singur ecran, fără pași: omul vine dintr-un SMS, pe telefon, probabil în
 * mașină. Fiecare pas în plus e o ocazie să renunțe și să nu mai vină deloc.
 *
 * Orele ocupate nu apar. Dacă totuși una se ocupă între încărcare și apăsare,
 * serverul răspunde `slot_full` și reîncărcăm lista pe loc — clientul vede ce
 * s-a întâmplat, nu un mesaj de eroare generic.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Check, CalendarDays, PhoneCall } from 'lucide-react';

interface Slot {
  starts_at: string;
  label: string;
  remaining: number;
}

interface DaySlots {
  date: string;
  slots: Slot[];
}

interface Booked {
  label: string;
  station: { name: string; phone: string | null; address: string | null };
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

export function BookingForm({ slug, stationPhone }: { slug: string; stationPhone: string | null }) {
  const [days, setDays] = useState<DaySlots[] | null>(null);
  const [chosen, setChosen] = useState<Slot | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  const loadSlots = () =>
    fetch(`/api/booking/${slug}`)
      .then((r) => r.json())
      .then((json) => setDays(json?.data?.days ?? []))
      .catch(() => setDays([]));

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const submit = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/booking/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          starts_at: chosen.starts_at,
          customer_phone: phone,
          customer_name: name.trim() || undefined,
          plate_number: plate.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? 'Programarea nu a putut fi făcută');
        // Ora s-a ocupat între timp: reîncărcăm, ca omul să vadă realitatea,
        // nu o listă în care ora refuzată încă apare liberă.
        if (json?.code === 'slot_full') {
          setChosen(null);
          await loadSlots();
        }
        return;
      }

      setBooked(json.data);
    } catch {
      setError('Eroare de rețea. Încearcă din nou.');
    } finally {
      setBusy(false);
    }
  };

  if (booked) {
    return (
      <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 dark:border-green-900/50 dark:bg-green-950/30">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-green-900 dark:text-green-200">
          <Check className="h-5 w-5" />
          Programare confirmată
        </h2>
        <p className="mt-2 text-green-900 dark:text-green-200">
          Te așteptăm <strong>{booked.label}</strong>.
        </p>
        {booked.station.address && (
          <p className="mt-1 text-sm text-green-800 dark:text-green-300">
            {booked.station.address}
          </p>
        )}
        {booked.station.phone && (
          <a
            href={`tel:${booked.station.phone}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-2"
          >
            <PhoneCall className="h-4 w-4" />
            Dacă nu mai poți ajunge, sună-ne: {booked.station.phone}
          </a>
        )}
      </div>
    );
  }

  if (days === null) {
    return <Loader2 className="mt-8 h-6 w-6 animate-spin text-gray-400" />;
  }

  if (days.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border bg-card p-6">
        <p className="text-gray-600">
          Nu sunt ore libere în perioada următoare.
          {stationPhone && (
            <>
              {' '}
              Sună-ne la{' '}
              <a href={`tel:${stationPhone}`} className="font-medium underline">
                {stationPhone}
              </a>{' '}
              și găsim o soluție.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <section>
        <h2 className="flex items-center gap-2 font-medium">
          <CalendarDays className="h-4 w-4" />
          Alege ora
        </h2>

        <div className="mt-3 space-y-4">
          {days.map((day) => (
            <div key={day.date}>
              <p className="text-sm text-gray-600">{dayLabel(day.date)}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {day.slots.map((slot) => {
                  const active = chosen?.starts_at === slot.starts_at;
                  return (
                    <button
                      key={slot.starts_at}
                      type="button"
                      onClick={() => setChosen(slot)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {chosen && (
        <section className="space-y-3 rounded-2xl border bg-card p-5">
          <p className="text-sm text-gray-600">
            Ai ales <strong>{dayLabel(chosen.starts_at.split('T')[0])}</strong>, ora{' '}
            <strong>{chosen.label}</strong>.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium">Telefon</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              type="tel"
              inputMode="tel"
            />
            {/* Singurul câmp obligatoriu: fără el stația nu te poate anunța
                dacă apare ceva. Restul se poate completa și la fața locului. */}
            <p className="mt-1 text-xs text-gray-500">
              Doar ca să te putem anunța dacă apare o schimbare.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Nume (opțional)</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Număr mașină (opțional)</label>
              <Input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="CT 30 LLE"
              />
            </div>
          </div>

          {error && <p className="text-sm text-amber-600 dark:text-amber-500">{error}</p>}

          <Button onClick={submit} disabled={busy || phone.trim().length < 10} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmă programarea'}
          </Button>
        </section>
      )}
    </div>
  );
}
