'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Filter } from 'lucide-react';

interface Reminder {
  id: string;
  plate_number: string;
  reminder_type: string;
  expiry_date: string;
  source: string;
  guest_phone: string | null;
  guest_name: string | null;
  user_id: string | null;
  station_id: string | null;
  created_at: string;
  users?: { email: string; phone: string | null } | null;
  kiosk_stations?: { name: string } | null;
}

interface RemindersTableProps {
  reminders: Reminder[];
}

const reminderTypeLabels: Record<string, string> = {
  itp: 'ITP',
  rca: 'RCA',
  rovinieta: 'Rovinieta',
};

const sourceLabels: Record<string, string> = {
  web: 'Web',
  kiosk: 'Kiosk',
};

export function RemindersTable({ reminders }: RemindersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const currentFilter = searchParams.get('filter') || 'all';

  // Filter reminders by search term
  const filteredReminders = reminders.filter((reminder) =>
    reminder.plate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    router.push(`/admin/reminders?${params.toString()}`);
  };

  const getPhoneDisplay = (reminder: Reminder) => {
    if (reminder.guest_phone) {
      return reminder.guest_phone;
    }
    if (reminder.users?.phone) {
      return reminder.users.phone;
    }
    if (reminder.users?.email) {
      return reminder.users.email;
    }
    return 'N/A';
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Button
            variant={currentFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('all')}
          >
            Toate
          </Button>
          <Button
            variant={currentFilter === 'user' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('user')}
          >
            Utilizatori
          </Button>
          <Button
            variant={currentFilter === 'guest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('guest')}
          >
            Invitați (Kiosk)
          </Button>
        </div>

        <Input
          placeholder="Caută după număr înmatriculare..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Număr</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Data Expirare</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Sursă</TableHead>
              <TableHead>Stație</TableHead>
              <TableHead>Creat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReminders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Nu s-au găsit reminder-uri' : 'Nu există reminder-uri'}
                </TableCell>
              </TableRow>
            ) : (
              filteredReminders.map((reminder) => (
                <TableRow key={reminder.id}>
                  <TableCell className="font-medium">{reminder.plate_number}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {reminderTypeLabels[reminder.reminder_type] || reminder.reminder_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(reminder.expiry_date), 'dd MMM yyyy', { locale: ro })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getPhoneDisplay(reminder)}
                    {reminder.guest_name && (
                      <div className="text-xs text-muted-foreground">{reminder.guest_name}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reminder.source === 'web' ? 'default' : 'secondary'}>
                      {sourceLabels[reminder.source] || reminder.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {reminder.kiosk_stations?.name || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(reminder.created_at), 'dd MMM yyyy', { locale: ro })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
