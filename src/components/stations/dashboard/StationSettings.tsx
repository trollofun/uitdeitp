'use client';

/**
 * Station settings — the "Setări" destination behind the dashboard.
 *
 * One card per subject (02-design-ux-pragnanz §3): buying credits, the
 * post-inspection review message, and the station's contact details. Nothing
 * here is a setting the station cannot explain to a customer; identity fields
 * (slug, RAR code, ingest) are admin-only and live in the admin panel.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface StationSettingsData {
  id: string;
  name: string;
  station_phone: string | null;
  station_address: string | null;
  review_link: string | null;
  review_sms_enabled: boolean | null;
  review_delay_days: number | null;
  sms_template_review: string | null;
}

/** Shape returned by GET /api/stations/me/checkout */
interface CreditPackage {
  permalink: string;
  label: string;
  parts: number;
  checkout_url: string;
}

export function StationSettings({
  station,
  reviewsLive,
}: {
  station: StationSettingsData;
  reviewsLive: boolean;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [packages, setPackages] = useState<CreditPackage[] | null>(null);
  const [checkoutChecked, setCheckoutChecked] = useState(false);

  const [reviewLink, setReviewLink] = useState(station.review_link ?? '');
  const [reviewEnabled, setReviewEnabled] = useState(Boolean(station.review_sms_enabled));
  const [reviewDelay, setReviewDelay] = useState(station.review_delay_days ?? 3);
  const [reviewTemplate, setReviewTemplate] = useState(station.sms_template_review ?? '');
  const [phone, setPhone] = useState(station.station_phone ?? '');
  const [address, setAddress] = useState(station.station_address ?? '');

  async function save(section: string, payload: Record<string, unknown>) {
    setSaving(section);
    try {
      const res = await fetch(`/api/stations/${station.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Salvarea a eșuat');

      toast({ title: 'Salvat' });
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Încearcă din nou',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  }

  async function loadPackages() {
    setCheckoutChecked(true);
    try {
      const res = await fetch('/api/stations/me/checkout');
      const json = await res.json();
      setPackages(json?.data?.available ? (json.data.packages ?? []) : null);
    } catch {
      setPackages(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      {/* Fără link „Înapoi": navigația stației e permanentă în layout. */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Setări</h1>
      </header>

      {/* Credits */}
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Credite pentru mesaje</h2>
        <p className="mt-1 text-gray-600">
          Fiecare mesaj trimis clienților tăi consumă credite.
        </p>

        {!checkoutChecked ? (
          <Button className="mt-4" variant="outline" onClick={loadPackages}>
            Vezi pachetele
          </Button>
        ) : packages && packages.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {packages.map((pack) => (
              <a
                key={pack.permalink}
                href={pack.checkout_url}
                className="rounded-xl border p-4 text-center transition hover:border-blue-500"
              >
                <p className="text-2xl font-bold">{pack.parts}</p>
                <p className="text-sm text-gray-600">mesaje</p>
                <p className="mt-2 text-sm font-semibold">{pack.label}</p>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            Cumpărarea de credite se activează în curând. Până atunci mesajele tale pleacă
            normal — te anunțăm înainte să se schimbe ceva.
          </p>
        )}
      </section>

      {/* Review request */}
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Cere o recenzie după inspecție</h2>
        <p className="mt-1 text-gray-600">
          La câteva zile după ITP, clientul primește un SMS scurt cu link-ul tău de Google.
        </p>

        {!reviewsLive && (
          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Funcția nu trimite încă nimic — așteptăm validarea juridică a textului de acord.
            Poți completa setările de pe acum; pornim doar cu acordul tău.
          </p>
        )}

        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={reviewEnabled}
              onChange={(event) => setReviewEnabled(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm">
              <span className="font-medium">Trimite cererea de recenzie</span>
              <span className="block text-gray-600">
                Un singur mesaj per client, per inspecție.
              </span>
            </span>
          </label>

          <div>
            <label className="mb-2 block text-sm font-medium">Link-ul tău de recenzie Google</label>
            <Input
              value={reviewLink}
              onChange={(event) => setReviewLink(event.target.value)}
              placeholder="https://g.page/r/..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">După câte zile</label>
            <select
              value={reviewDelay}
              onChange={(event) => setReviewDelay(Number(event.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {[1, 3, 7].map((days) => (
                <option key={days} value={days}>
                  {days} {days === 1 ? 'zi' : 'zile'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Mesajul</label>
            <textarea
              value={reviewTemplate}
              onChange={(event) => setReviewTemplate(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Mulțumim că ai ales {station_name}! Ne ajuți cu o părere? {review_link}"
            />
            <p className="mt-1 text-sm text-gray-600">
              Poți folosi {'{station_name}'} și {'{review_link}'} — se completează automat.
            </p>
          </div>

          <Button
            disabled={saving === 'review'}
            onClick={() =>
              save('review', {
                review_sms_enabled: reviewEnabled,
                review_delay_days: reviewDelay,
                review_link: reviewLink.trim() || null,
                sms_template_review: reviewTemplate.trim() || null,
              })
            }
          >
            {saving === 'review' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvează'}
          </Button>
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Datele stației</h2>
        <p className="mt-1 text-gray-600">Apar în mesajele trimise clienților.</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Telefon</label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Adresă</label>
            <Input value={address} onChange={(event) => setAddress(event.target.value)} />
          </div>
          <Button
            disabled={saving === 'contact'}
            onClick={() =>
              save('contact', {
                station_phone: phone.trim() || null,
                station_address: address.trim() || null,
              })
            }
          >
            {saving === 'contact' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvează'}
          </Button>
        </div>
      </section>
    </div>
  );
}
