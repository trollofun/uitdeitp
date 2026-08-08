'use client';

/**
 * Importul bazei de clienți, din perspectiva patronului.
 *
 * Ecranul e construit în jurul singurului lucru care contează după ce apeși
 * butonul: **ce n-a intrat și de ce**. Un „import reușit" fără raport lasă
 * stația să creadă că are 500 de clienți când are 430, iar cei 70 află abia
 * când le expiră ITP-ul.
 */

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileSpreadsheet, AlertTriangle, Check } from 'lucide-react';

interface RejectedRow {
  line: number;
  reason: string;
  value?: string;
}

interface ImportSummary {
  imported: number;
  duplicates: number;
  superseded: number;
  rejected: RejectedRow[];
  total: number;
  matched_columns: Record<string, string>;
}

export function ImportClients() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const submit = async () => {
    if (!file) return;

    setBusy(true);
    setSummary(null);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('consent_attested', String(attested));

      const response = await fetch('/api/stations/me/import', { method: 'POST', body });
      const json = await response.json();

      if (!response.ok) {
        toast({
          title: 'Importul nu a pornit',
          description: json?.error?.message ?? 'Eroare necunoscută',
          variant: 'destructive',
        });
        return;
      }

      setSummary(json.data);
      setFile(null);
      setAttested(false);
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      toast({ title: 'Eroare de rețea', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Importă clienții existenți</h2>
      <p className="mt-1 text-sm text-gray-600">
        Un fișier Excel (.xlsx) sau CSV cu clienții pe care îi ai deja. Recunoaștem singuri
        coloanele de nume, telefon, număr de înmatriculare și dată de expirare.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90"
          />
          {file && (
            <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <FileSpreadsheet className="h-4 w-4" />
              {file.name} · {Math.round(file.size / 1024)} KB
            </p>
          )}
        </div>

        {/* Atestarea e temeiul legal pentru care avem voie să trimitem SMS-uri
            acestor oameni. Nu e o formalitate, deci nu e prebifată. */}
        <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
          <input
            type="checkbox"
            checked={attested}
            onChange={(event) => setAttested(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span className="text-sm">
            <span className="font-medium">Confirm că am acordul acestor clienți</span>
            <span className="block text-gray-600">
              Ei ți-au lăsat numărul ca să-i anunți despre expirarea ITP. Fără această
              confirmare nu putem trimite nimic. Clienții importați nu primesc cereri de
              recenzie — pentru acelea e nevoie de acordul dat pe textul nostru.
            </span>
          </span>
        </label>

        <Button onClick={submit} disabled={!file || !attested || busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Se importă…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Importă
            </>
          )}
        </Button>
      </div>

      {summary && (
        <div className="mt-6 space-y-4 border-t pt-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-2xl font-semibold text-green-700 dark:text-green-500">
                {summary.imported}
              </div>
              <div className="text-gray-600">importați</div>
            </div>
            {summary.duplicates > 0 && (
              <div>
                <div className="text-2xl font-semibold">{summary.duplicates}</div>
                <div className="text-gray-600">deja existau, mai noi</div>
              </div>
            )}
            {summary.superseded > 0 && (
              <div>
                <div className="text-2xl font-semibold">{summary.superseded}</div>
                <div className="text-gray-600">actualizați</div>
              </div>
            )}
            {summary.rejected.length > 0 && (
              <div>
                <div className="text-2xl font-semibold text-amber-600 dark:text-amber-500">
                  {summary.rejected.length}
                </div>
                <div className="text-gray-600">nu au putut fi citiți</div>
              </div>
            )}
          </div>

          {summary.rejected.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-500">
              <Check className="h-4 w-4" />
              Tot fișierul a intrat.
            </p>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/40">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                Rânduri de reparat în fișier
              </p>
              {/* Linia e cea din Excel, ca omul să deschidă fișierul și să sară
                  direct acolo. Fără asta, raportul e inutilizabil la 500 de rânduri. */}
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm text-amber-900 dark:text-amber-200">
                {summary.rejected.map((row, index) => (
                  <li key={`${row.line}-${index}`}>
                    <span className="font-mono">linia {row.line}</span> — {row.reason}
                    {row.value && <span className="opacity-75"> („{row.value}")</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
