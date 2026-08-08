'use client';

/**
 * Who works at a station.
 *
 * The owner column holds exactly one person, so a second pair of hands — an
 * inspector — needs a membership row. Without this screen that meant a
 * hand-written INSERT for every employee.
 *
 * An inspector sees the station's work list and can move a date or send the
 * reminder, but never a customer's name or phone number. That is the whole
 * point of the distinction: someone who leaves does not walk away with the
 * client list.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { Loader2, UserPlus } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  role: 'inspector' | 'patron';
  status: 'active' | 'left';
  created_at: string;
  left_at: string | null;
}

export function StationMembers({ stationId }: { stationId: string }) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'inspector' | 'patron'>('inspector');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stations/${stationId}/members`);
      const json = await res.json();
      setMembers(json?.data?.members ?? []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/stations/${stationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Nu am putut adăuga');

      toast({ title: json?.data?.message ?? 'Adăugat', variant: 'success' });
      setEmail('');
      await load();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Încearcă din nou',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(member: Member) {
    if (!window.confirm('Retragi accesul acestei persoane la stație?')) return;

    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/stations/${stationId}/members?user_id=${member.user_id}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Nu am putut retrage accesul');

      toast({ title: 'Accesul a fost retras', variant: 'success' });
      await load();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'Încearcă din nou',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  const active = members.filter((m) => m.status === 'active');

  return (
    <Card className="p-8">
      <h2 className="text-xl font-semibold mb-2">Cine lucrează la stație</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Proprietarul stației vede tot. Un inspector vede lista de lucru și poate schimba o
        dată sau trimite mesajul, dar nu vede numele și telefonul clienților.
      </p>

      <form onSubmit={addMember} className="flex flex-wrap items-end gap-3 mb-6">
        <div className="min-w-[220px] flex-1">
          <label className="block text-sm font-medium mb-2">Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="inspector@statie.ro"
            type="email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'inspector' | 'patron')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="inspector">Inspector</option>
            <option value="patron">Administrator stație</option>
          </select>
        </div>
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
          Adaugă
        </Button>
      </form>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : active.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nimeni în afară de proprietar. Persoana trebuie să aibă deja cont pe platformă.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {active.map((member) => (
            <li key={member.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">
                  {member.role === 'patron' ? 'Administrator stație' : 'Inspector'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Adăugat pe {new Date(member.created_at).toLocaleDateString('ro-RO')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => removeMember(member)}
                className="text-red-700"
              >
                Retrage accesul
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
