'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/services/date';
import { UrgencyBadge } from './UrgencyBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Edit, Trash2, Eye } from 'lucide-react';

interface Reminder {
  id: string;
  plate_number: string;
  reminder_type: 'itp' | 'rca' | 'rovinieta';
  expiry_date: string;
  created_at: string;
  notification_channels: {
    sms: boolean;
    email: boolean;
  };
}

interface RemindersListProps {
  reminders: Reminder[];
  onDelete?: (ids: string[]) => void;
}

const reminderTypeLabels = {
  itp: 'ITP',
  rca: 'RCA',
  rovinieta: 'Rovinieta',
};

export function RemindersList({ reminders, onDelete }: RemindersListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === reminders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reminders.map((r) => r.id)));
    }
  };

  const handleBulkDelete = () => {
    if (onDelete && selectedIds.size > 0) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
          <span className="text-sm font-medium">
            {selectedIds.size} reminder{selectedIds.size > 1 ? '-uri' : ''} selectat{selectedIds.size > 1 ? 'e' : ''}
          </span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Șterge
          </Button>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedIds.size === reminders.length && reminders.length > 0}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Număr înmatriculare</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead>Data expirării</TableHead>
            <TableHead>Urgență</TableHead>
            <TableHead>Notificări</TableHead>
            <TableHead className="text-right">Acțiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reminders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nu există reminder-uri
              </TableCell>
            </TableRow>
          ) : (
            reminders.map((reminder) => (
              <TableRow key={reminder.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(reminder.id)}
                    onCheckedChange={() => toggleSelection(reminder.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{reminder.plate_number}</TableCell>
                <TableCell>
                  <Badge variant="outline">{reminderTypeLabels[reminder.reminder_type]}</Badge>
                </TableCell>
                <TableCell>{formatDate(reminder.expiry_date)}</TableCell>
                <TableCell>
                  <UrgencyBadge expiryDate={reminder.expiry_date} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {reminder.notification_channels.sms && (
                      <Badge variant="secondary" className="text-xs">
                        SMS
                      </Badge>
                    )}
                    {reminder.notification_channels.email && (
                      <Badge variant="secondary" className="text-xs">
                        Email
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/reminders/${reminder.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/dashboard/reminders/${reminder.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete?.([reminder.id])}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
