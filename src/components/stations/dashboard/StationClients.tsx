'use client';

/**
 * "Vezi tot" behind the first dashboard card: the station's clients.
 *
 * Two views on one screen, not two pages — they are the same list seen two
 * ways, and 02-design-ux-pragnanz §3 keeps secondary detail off the main
 * dashboard rather than scattering it across routes.
 *
 * Read-only by design plus one action (stop messages). The station owner holds
 * SELECT on their reminders, not UPDATE — see the comment in
 * /api/stations/me/consent — so the dashboard's driver-side table components,
 * which assume edit/delete, are deliberately not reused here.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Search } from 'lucide-react';

interface ClientRow {
  id: string;
  plate_number: string;
  guest_name: string | null;
  guest_phone: string | null;
  expiry_date: string;
  consent_given?: boolean | null;
  consent_timestamp?: string | null;
  consent_version?: string | null;
  opt_out?: boolean | null;
  globally_opted_out?: boolean;
}

type View = 'lista' | 'consimtamant';

const PAGE_SIZE = 25;

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function StationClients({ station }: { station: { id: string; name: string } }) {
  const { toast } = useToast();
  const [view, setView] = useState<View>('lista');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const endpoint = view === 'lista' ? 'reminders' : 'consent';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query) params.set('q', query);

      const res = await fetch(`/api/stations/me/${endpoint}?${params}`);
      const json = await res.json();
      const data = json?.data ?? {};

      setRows(data.reminders ?? data.clients ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, query]);

  useEffect(() => {
    load();
  }, [load]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  function switchView(next: View) {
    setView(next);
    setPage(1);
  }

  async function toggleConsent(row: ClientRow) {
    const revoking = !row.opt_out;
    const who = row.guest_name || row.plate_number;

    if (
      revoking &&
      !window.confirm(`Oprești mesajele către ${who}? Nu va mai primi nicio notificare de la tine.`)
    ) {
      return;
    }

    setBusyId(row.id);
    try {
      const res = await fetch('/api/stations/me/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminder_id: row.id,
          action: revoking ? 'revoke' : 'restore',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Nu am putut salva');

      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, opt_out: revoking } : item))
      );
      toast({ title: json?.data?.message ?? 'Salvat' });
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Încearcă din nou',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      {/* Fără link „Înapoi": navigația stației e permanentă în layout. */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Clienții tăi</h1>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={view === 'lista' ? 'default' : 'outline'}
          onClick={() => switchView('lista')}
        >
          Listă
        </Button>
        <Button
          variant={view === 'consimtamant' ? 'default' : 'outline'}
          onClick={() => switchView('consimtamant')}
        >
          Acordul clienților
        </Button>
      </div>

      <form onSubmit={submitSearch} className="flex gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Caută după număr, nume sau telefon"
        />
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          {query ? 'Niciun client găsit.' : 'Încă nu ai clienți înregistrați.'}
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{row.plate_number}</p>
                <p className="truncate text-sm text-gray-600">
                  {row.guest_name || 'Fără nume'}
                  {view === 'lista' ? ` · expiră ${formatDate(row.expiry_date)}` : ''}
                </p>

                {view === 'consimtamant' && (
                  <p className="mt-1 text-sm text-gray-600">
                    {row.globally_opted_out
                      ? 'Clientul s-a dezabonat singur — nu poate fi reactivat de aici'
                      : row.opt_out
                        ? 'Ai oprit mesajele către acest client'
                        : row.consent_given
                          ? `A dat acordul pe ${formatDate(row.consent_timestamp)}`
                          : 'Fără acord înregistrat'}
                  </p>
                )}
              </div>

              {row.guest_phone && (
                <a
                  href={`tel:${row.guest_phone}`}
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {row.guest_phone}
                </a>
              )}

              {view === 'consimtamant' && !row.globally_opted_out && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId === row.id}
                  onClick={() => toggleConsent(row)}
                >
                  {busyId === row.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : row.opt_out ? (
                    'Reactivează'
                  ) : (
                    'Oprește mesajele'
                  )}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Înapoi
          </Button>
          <span className="text-sm text-gray-600">
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Mai departe
          </Button>
        </div>
      )}
    </div>
  );
}
