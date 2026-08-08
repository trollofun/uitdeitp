'use client';

/**
 * What an inspector sees: the station's work list, and nothing about the
 * people on it.
 *
 * No name, no phone, no call button — the data never reaches the browser,
 * because /api/stations/me/inspections does not select those columns. An
 * inspector who leaves the station walks away with nothing.
 *
 * They can still do the two things the job needs: correct an expiry date and
 * send the client the station's reminder. The second one works without ever
 * revealing the number — the server reads it, sends, and reports only whether
 * it went.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';

interface InspectionRow {
  id: string;
  plate_number: string;
  expiry_date: string;
  next_notification_date: string | null;
  last_notification_sent_at: string | null;
  opt_out: boolean | null;
}

const PAGE_SIZE = 25;

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLeft(expiry: string): number {
  const diff = new Date(expiry).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function StationInspections({ station }: { station: { id: string; name: string } }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query) params.set('q', query);

      const res = await fetch(`/api/stations/me/inspections?${params}`);
      const json = await res.json();
      const data = json?.data ?? {};

      setRows(data.inspections ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(row: InspectionRow, request: () => Promise<Response>, reload = false) {
    setBusyId(row.id);
    try {
      const res = await request();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || json?.error || 'Nu am putut salva');
      if (reload) await load();
      toast({ title: json?.data?.message ?? 'Gata' });
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

  function changeExpiry(row: InspectionRow) {
    const current = row.expiry_date?.slice(0, 10) ?? '';
    const next = window.prompt(
      `Noua dată de expirare pentru ${row.plate_number} (AAAA-LL-ZZ):`,
      current
    );
    if (!next || next === current) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(next.trim())) {
      toast({
        title: 'Dată invalidă',
        description: 'Folosește formatul 2027-03-15',
        variant: 'destructive',
      });
      return;
    }

    run(
      row,
      () =>
        fetch(`/api/stations/me/reminders/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiry_date: next.trim() }),
        }),
      true
    );
  }

  function notify(row: InspectionRow) {
    if (!window.confirm(`Trimiți acum mesajul de reminder pentru ${row.plate_number}?`)) return;
    run(row, () => fetch(`/api/stations/me/reminders/${row.id}/notify`, { method: 'POST' }));
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{station.name}</h1>
        <p className="text-gray-600">Inspecțiile stației</p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
        className="flex gap-2"
      >
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Caută după numărul de înmatriculare"
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
          {query ? 'Nicio inspecție găsită.' : 'Încă nu există inspecții înregistrate.'}
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white">
          {rows.map((row) => {
            const left = daysLeft(row.expiry_date);
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{row.plate_number}</p>
                  <p className="text-sm text-gray-600">
                    Expiră {formatDate(row.expiry_date)}
                    {left >= 0 ? ` · peste ${left} zile` : ` · expirat de ${-left} zile`}
                  </p>
                  {row.opt_out && (
                    <p className="mt-1 text-sm text-gray-600">
                      Clientul a cerut să nu mai primească mesaje
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => changeExpiry(row)}
                  >
                    Schimbă data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyId === row.id || Boolean(row.opt_out)}
                    onClick={() => notify(row)}
                  >
                    {busyId === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Trimite mesajul'
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
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
