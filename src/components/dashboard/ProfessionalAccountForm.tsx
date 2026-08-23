'use client';

/**
 * Crearea contului profesional de inspector (23.08). După creare, cheia de
 * ingest SIRAR se afișează O SINGURĂ DATĂ — ecranul insistă să fie salvată.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface IngestBundle {
  key: string;
  hmac_secret: string;
  endpoint: string;
}

export function ProfessionalAccountForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gdpr, setGdpr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    dashboardUrl: string;
    ingest: IngestBundle | null;
  } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/stations/professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, gdpr_accepted: gdpr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Crearea a eșuat');
      setCreated({ dashboardUrl: data.dashboard_url, ingest: data.ingest });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Crearea a eșuat');
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-lg font-semibold text-green-900">Contul tău e gata 🎉</h2>

        {created.ingest ? (
          <div className="space-y-2">
            <p className="text-sm text-green-900">
              <strong>Cheia ta SIRAR — se afișează O SINGURĂ DATĂ.</strong> Pune-o în agentul
              tău SIRAR și clienții pe care îi introduci vor apărea automat aici.
            </p>
            <div className="space-y-1 rounded-md bg-white p-3 font-mono text-xs break-all">
              <p><span className="text-gray-500">Endpoint:</span> {created.ingest.endpoint}</p>
              <p><span className="text-gray-500">Cheie:</span> {created.ingest.key}</p>
              <p><span className="text-gray-500">Secret HMAC:</span> {created.ingest.hmac_secret}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                navigator.clipboard.writeText(
                  `SIRAR_ENDPOINT=${created.ingest!.endpoint}\nSIRAR_KEY=${created.ingest!.key}\nSIRAR_HMAC=${created.ingest!.hmac_secret}`
                )
              }
            >
              Copiază tot
            </Button>
          </div>
        ) : (
          <p className="text-sm text-amber-800">
            Contul e creat, dar cheia SIRAR nu a putut fi emisă acum — scrie-ne la
            contact@uitdeitp.ro și o emitem noi.
          </p>
        )}

        <Button onClick={() => router.push(created.dashboardUrl)} className="w-full">
          Mergi la clienții tăi
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium">Numele tău (apare în SMS-uri) *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ion Popescu — Inspector ITP" required minLength={3} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Telefonul tău *</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx" required />
      </div>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={gdpr}
          onChange={(e) => setGdpr(e.target.checked)}
          className="mt-1"
          required
        />
        <span>
          Confirm că sunt responsabil, ca operator de date, pentru clienții pe care îi adaug și
          că am acordul lor pentru notificări (GDPR).
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={busy || !gdpr} className="w-full">
        {busy ? 'Se creează…' : 'Creează contul profesional'}
      </Button>
    </form>
  );
}
