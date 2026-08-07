'use client';

/**
 * Station dashboard — exactly four cards (02-design-ux-pragnanz §3):
 * clients notified, credits, return calendar, station message.
 * Everything else lives behind "Vezi tot" / "Setări".
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NotificationTemplateEditor } from '@/components/admin/NotificationTemplateEditor';
import { useToast } from '@/hooks/use-toast';
import { Phone } from 'lucide-react';

interface UpcomingClient {
  id: string;
  plate_number: string;
  guest_name: string | null;
  guest_phone: string | null;
  expiry_date: string;
}

interface UpcomingDay {
  date: string;
  count: number;
  clients: UpcomingClient[];
}

interface StationInfo {
  id: string;
  name: string;
  station_phone: string | null;
  station_address: string | null;
  sms_template_5d: string | null;
  sms_template_3d: string | null;
  sms_template_1d: string | null;
  email_template_5d: string | null;
  email_template_3d: string | null;
  email_template_1d: string | null;
}

export function StationDashboard({ station }: { station: StationInfo }) {
  const { toast } = useToast();
  const [notified, setNotified] = useState<number | null>(null);
  const [balance, setBalance] = useState<{ available: boolean; balance_parts?: number }>({
    available: false,
  });
  const [days, setDays] = useState<UpcomingDay[]>([]);

  useEffect(() => {
    fetch('/api/stations/me/stats')
      .then((r) => r.json())
      .then((j) => setNotified(j?.data?.stats?.notifications_sent ?? 0))
      .catch(() => setNotified(null));

    fetch('/api/stations/me/balance')
      .then((r) => r.json())
      .then((j) => setBalance(j?.data ?? { available: false }))
      .catch(() => setBalance({ available: false }));

    fetch('/api/stations/me/upcoming')
      .then((r) => r.json())
      .then((j) => setDays(j?.data?.days ?? []))
      .catch(() => setDays([]));
  }, []);

  async function saveTemplates(templates: Record<string, string>) {
    const res = await fetch(`/api/stations/${station.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templates),
    });

    if (!res.ok) throw new Error('Salvarea a eșuat');
    toast({ title: 'Mesajele au fost salvate' });
  }

  const lowCredit = balance.available && (balance.balance_parts ?? 0) < 50;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{station.name}</h1>
          <p className="text-gray-600">Clienții tăi și mesajele trimise</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/stations/dashboard/setari">Setări</Link>
        </Button>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Clients notified */}
        <section className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-600">Clienți anunțați</p>
          <p className="mt-2 text-5xl font-bold">{notified ?? '—'}</p>
          <Link
            href="/stations/dashboard/clienti"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            Vezi tot
          </Link>
        </section>

        {/* 2. Credits */}
        <section className="rounded-2xl border bg-white p-6">
          <p className="text-sm text-gray-600">Credite rămase</p>
          <p className="mt-2 text-5xl font-bold">
            {balance.available ? balance.balance_parts : '—'}
          </p>
          {!balance.available && (
            <p className="mt-2 text-sm text-gray-500">Se activează în curând</p>
          )}
          {lowCredit && (
            <Button className="mt-4 w-full" asChild>
              <Link href="/stations/dashboard/setari">Cumpără credite</Link>
            </Button>
          )}
        </section>

        {/* 3. Return calendar */}
        <section className="rounded-2xl border bg-white p-6 md:col-span-2">
          <p className="text-sm text-gray-600">Când revin clienții</p>
          {days.length === 0 ? (
            <p className="mt-3 text-gray-500">Nicio expirare luna aceasta.</p>
          ) : (
            <ul className="mt-4 divide-y">
              {days.slice(0, 8).map((day) => (
                <li key={day.date} className="py-3">
                  <p className="text-sm font-medium">
                    {new Date(day.date).toLocaleDateString('ro-RO', {
                      day: 'numeric',
                      month: 'long',
                    })}{' '}
                    <span className="text-gray-500">· {day.count} clienți</span>
                  </p>
                  <ul className="mt-2 space-y-1">
                    {day.clients.map((client) => (
                      <li key={client.id} className="flex items-center justify-between text-sm">
                        <span>
                          {client.plate_number}
                          {client.guest_name ? ` · ${client.guest_name}` : ''}
                        </span>
                        {client.guest_phone && (
                          <a
                            href={`tel:${client.guest_phone}`}
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Phone className="h-4 w-4" />
                            {client.guest_phone}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 4. Station message */}
        <section className="rounded-2xl border bg-white p-6 md:col-span-2">
          <p className="mb-4 text-sm text-gray-600">Mesajul stației</p>
          <NotificationTemplateEditor
            smsTemplate5d={station.sms_template_5d ?? ''}
            smsTemplate3d={station.sms_template_3d ?? ''}
            smsTemplate1d={station.sms_template_1d ?? ''}
            emailTemplate5d={station.email_template_5d ?? ''}
            emailTemplate3d={station.email_template_3d ?? ''}
            emailTemplate1d={station.email_template_1d ?? ''}
            stationName={station.name}
            stationPhone={station.station_phone ?? ''}
            stationAddress={station.station_address ?? ''}
            onSave={saveTemplates}
          />
        </section>
      </div>
    </div>
  );
}

export default StationDashboard;
