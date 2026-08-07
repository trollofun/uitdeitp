'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Copy, KeyRound, Loader2, ShieldAlert, Trash2 } from 'lucide-react';

interface StationKey {
  id: string;
  label: string;
  key_prefix: string;
  scopes: string[] | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

interface IssuedKey {
  key: string;
  hmac_secret: string;
}

export function StationApiKeys({ stationId }: { stationId: string }) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<StationKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<IssuedKey | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/stations/${stationId}/keys`);
      const json = await res.json();
      setKeys(json?.data?.keys ?? []);
    } catch {
      toast({ variant: 'destructive', title: 'Eroare', description: 'Nu am putut încărca cheile.' });
    } finally {
      setLoading(false);
    }
  }, [stationId, toast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function issueKey() {
    setIssuing(true);
    try {
      const res = await fetch(`/api/admin/stations/${stationId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'SIRAR' }),
      });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error?.message || 'Emiterea a eșuat');

      setIssued({ key: json.data.key, hmac_secret: json.data.hmac_secret });
      await loadKeys();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Emiterea a eșuat',
      });
    } finally {
      setIssuing(false);
    }
  }

  async function revokeKey(keyId: string) {
    try {
      const res = await fetch(`/api/admin/stations/${stationId}/keys/${keyId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Revocarea a eșuat');
      toast({ title: 'Cheie revocată' });
      await loadKeys();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Revocarea a eșuat',
      });
    }
  }

  function copy(value: string) {
    navigator.clipboard.writeText(value);
    toast({ title: 'Copiat' });
  }

  return (
    <div className="rounded-2xl border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium">Chei de integrare</h3>
        </div>
        <Button onClick={issueKey} disabled={issuing}>
          {issuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Emite cheie
        </Button>
      </div>

      <p className="text-sm text-gray-600">
        Cheia identifică stația când automatizarea trimite inspecții. Se afișează o singură dată.
      </p>

      {issued && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800">
            <ShieldAlert className="h-4 w-4" />
            <span className="font-medium">Se afișează o singură dată — copiază acum</span>
          </div>

          {[
            { label: 'Cheie (Bearer)', value: issued.key },
            { label: 'Secret semnătură (HMAC)', value: issued.hmac_secret },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-xs font-medium text-amber-900">{item.label}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-xl bg-white px-3 py-2 text-xs">
                  {item.value}
                </code>
                <Button variant="outline" size="sm" onClick={() => copy(item.value)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="ghost" size="sm" onClick={() => setIssued(null)}>
            Am salvat cheile
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Se încarcă…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-gray-500">Nicio cheie emisă.</p>
      ) : (
        <ul className="divide-y">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between py-3">
              <div className="space-y-1">
                <p className="font-medium">
                  {key.label}{' '}
                  <code className="text-xs text-gray-500">{key.key_prefix}…</code>
                </p>
                <p className="text-xs text-gray-500">
                  {key.revoked_at
                    ? `Revocată ${new Date(key.revoked_at).toLocaleDateString('ro-RO')}`
                    : key.last_used_at
                      ? `Folosită ultima dată ${new Date(key.last_used_at).toLocaleString('ro-RO')}`
                      : 'Nefolosită încă'}
                </p>
              </div>
              {!key.revoked_at && (
                <Button variant="outline" size="sm" onClick={() => revokeKey(key.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revocă
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default StationApiKeys;
