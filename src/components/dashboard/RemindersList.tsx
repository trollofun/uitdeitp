'use client';

import { ReminderCard } from './ReminderCard';
import { Car, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Reminder {
  id: string;
  plate_number: string;
  itp_expiry_date: string;
  sms_notifications_enabled: boolean;
  station_slug?: string;
  status: string;
}

interface RemindersListProps {
  reminders: Reminder[];
}

export function RemindersList({ reminders }: RemindersListProps) {
  const router = useRouter();

  const handleUpdate = () => {
    router.refresh();
  };

  if (reminders.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-12 text-center">
        <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
        <h3 className="text-xl font-semibold mb-2">Nu ai vehicule înregistrate</h3>
        <p className="text-muted-foreground mb-6">
          Începe prin a adăuga primul tău vehicul pentru a primi reminder-e ITP
        </p>
        <Link href="/dashboard/add-vehicle">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Primul Vehicul
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reminders.map((reminder) => (
        <ReminderCard
          key={reminder.id}
          reminder={reminder}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}
