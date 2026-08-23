'use client';

/**
 * Uneltele de reconciliere ale adminului (PRD credite + cerința din 23.08:
 * „dacă trebuie să fac reconciliere manual, are adminul unelte?").
 *
 * Trei zone: soldurile stațiilor, achizițiile recente (failed/pending sar în
 * ochi), istoricul de ledger. Două acțiuni: „Rulează reconcilierea acum"
 * (exact funcția cronului) și ajustarea manuală per stație (linie
 * adjust_admin cu motiv obligatoriu — auditabilă, nu editabilă).
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { RefreshCw } from 'lucide-react';

interface StationRow {
  id: string;
  name: string;
  rar_code: string | null;
  is_active: boolean;
  balance: number;
}
interface PurchaseRow {
  id: string;
  station_id: string | null;
  payment_ref: string;
  product_permalink: string | null;
  amount_parts: number;
  status: string;
  created_at: string;
}
interface LedgerRow {
  station_id: string;
  delta: number;
  motiv: string;
  descriere: string | null;
  sold_rezultat: number;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  credited: 'bg-green-100 text-green-800',
  refunded: 'bg-gray-200 text-gray-700',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-800',
};

export function CreditsAdminPanel() {
  const { toast } = useToast();
  const [stations, setStations] = useState<StationRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/credits');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Eroare la încărcare');
      setStations(data.stations ?? []);
      setPurchases(data.purchases ?? []);
      setLedger(data.ledger ?? []);
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Nu am putut încărca datele',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const runReconcile = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconcile' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Reconcilierea a eșuat');

      const recovered =
        (data.missing_processed ?? 0) +
        (data.pending_retry?.credited ?? 0) +
        (data.unresolved_retry?.healed ?? 0);
      toast({
        title: recovered > 0 ? `Reconciliere: ${recovered} operații recuperate` : 'Reconciliere: totul era la zi',
        description: `${data.sales_relevant ?? 0} vânzări verificate (din ${data.sales_seen ?? 0} văzute, ultimele 3 zile).`,
        variant: 'success',
      });
      await load();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Reconcilierea a eșuat',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const adjust = async (station: StationRow) => {
    const deltaRaw = window.prompt(
      `Ajustare pentru „${station.name}" (sold: ${station.balance} credite).\nDelta (pozitiv = adaugă, negativ = scade):`
    );
    if (!deltaRaw) return;
    const delta = Number(deltaRaw);
    if (!Number.isInteger(delta) || delta === 0) {
      toast({ title: 'Delta invalid', description: 'Număr întreg, diferit de zero.', variant: 'destructive' });
      return;
    }
    const descriere = window.prompt('Motivul ajustării (apare în istoricul stației):');
    if (!descriere || descriere.trim().length < 5) {
      toast({ title: 'Motiv lipsă', description: 'Fiecare ajustare are nevoie de un motiv (min. 5 caractere).', variant: 'destructive' });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust', station_id: station.id, delta, descriere: descriere.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Ajustarea a eșuat');
      toast({
        title: 'Ajustare înregistrată',
        description: `„${station.name}": sold nou ${data.balance} credite.`,
        variant: 'success',
      });
      await load();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Ajustarea a eșuat',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const manualSale = async (station: StationRow) => {
    const creditsRaw = window.prompt(
      `Vânzare manuală pentru „${station.name}" (plată prin virament/factură).\nCâte credite? (ex. 250 / 500 / 1000):`
    );
    if (!creditsRaw) return;
    const credits = Number(creditsRaw);
    if (!Number.isInteger(credits) || credits <= 0) {
      toast({ title: 'Număr invalid', description: 'Credite: număr întreg pozitiv.', variant: 'destructive' });
      return;
    }
    const paymentRef = window.prompt('Referința plății (nr. factură / OP) — obligatorie, previne dubla creditare:');
    if (!paymentRef || paymentRef.trim().length < 3) {
      toast({ title: 'Referință lipsă', description: 'Numărul facturii sau al OP-ului e obligatoriu.', variant: 'destructive' });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_sale',
          station_id: station.id,
          credits,
          payment_ref: paymentRef.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Înregistrarea a eșuat');
      toast({
        title: data.duplicate ? 'Factura era deja înregistrată' : 'Vânzare înregistrată',
        description: `„${station.name}": sold ${data.balance} credite. Creditele expiră la 12 luni, ca la Gumroad.`,
        variant: 'success',
      });
      await load();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Înregistrarea a eșuat',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const stationName = (id: string | null) =>
    stations.find((s) => s.id === id)?.name ?? (id ? `${id.slice(0, 8)}…` : '—');

  if (loading) return <p className="text-muted-foreground">Se încarcă…</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button onClick={runReconcile} disabled={busy}>
          <RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          Rulează reconcilierea acum
        </Button>
        <p className="text-sm text-muted-foreground">
          Trage vânzările din Gumroad (3 zile), procesează ce lipsește, reia pending/failed.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Solduri per stație</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Stație</th>
                <th className="p-3">RAR</th>
                <th className="p-3 text-right">Sold (credite)</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {stations.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    {s.name}
                    {!s.is_active && <span className="ml-2 text-xs text-gray-500">(inactivă)</span>}
                  </td>
                  <td className="p-3 font-mono text-xs">{s.rar_code ?? '—'}</td>
                  <td className="p-3 text-right font-medium">{s.balance}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      {/* Bani reali → purchase cu expirare 12 luni; corecție → adjust fără expirare */}
                      <Button variant="default" size="sm" onClick={() => manualSale(s)} disabled={busy}>
                        Vânzare manuală
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => adjust(s)} disabled={busy}>
                        Ajustează
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Achiziții recente</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Stație</th>
                <th className="p-3">Produs</th>
                <th className="p-3 text-right">Credite</th>
                <th className="p-3">Status</th>
                <th className="p-3">Referință</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 && (
                <tr><td className="p-3 text-muted-foreground" colSpan={6}>Nicio achiziție încă.</td></tr>
              )}
              {purchases.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3 whitespace-nowrap">{new Date(p.created_at).toLocaleString('ro-RO')}</td>
                  <td className="p-3">{stationName(p.station_id)}</td>
                  <td className="p-3">{p.product_permalink ?? '—'}</td>
                  <td className="p-3 text-right">{p.amount_parts}</td>
                  <td className="p-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[p.status] ?? ''}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">{p.payment_ref.slice(0, 16)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Ultimele mișcări de ledger</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Stație</th>
                <th className="p-3">Explicație</th>
                <th className="p-3 text-right">Δ</th>
                <th className="p-3 text-right">Sold</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr><td className="p-3 text-muted-foreground" colSpan={5}>Ledger gol.</td></tr>
              )}
              {ledger.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString('ro-RO')}</td>
                  <td className="p-3">{stationName(l.station_id)}</td>
                  <td className="p-3">{l.descriere ?? l.motiv}</td>
                  <td className={`p-3 text-right font-medium ${l.delta < 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {l.delta > 0 ? `+${l.delta}` : l.delta}
                  </td>
                  <td className="p-3 text-right">{l.sold_rezultat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
