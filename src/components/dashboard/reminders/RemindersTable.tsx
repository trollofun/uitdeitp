'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Edit, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import type { Database } from '@/types';

type Reminder = Database['public']['Tables']['reminders']['Row'];

interface RemindersTableProps {
  data: Reminder[];
  isLoading?: boolean;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
  onSendSMS: (reminder: Reminder) => void;
}

export function RemindersTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onSendSMS,
}: RemindersTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Se încarcă...
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          Nu există reminder-e
        </div>
      </div>
    );
  }

  const getReminderTypeLabel = (type: string) => {
    switch (type) {
      case 'itp':
        return 'ITP';
      case 'rca':
        return 'RCA';
      case 'rovinieta':
        return 'Rovinieta';
      default:
        return type;
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  };

  const isExpired = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    return expiry < now;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Număr Înmatriculare</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead>Data Expirare</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Nume</TableHead>
            <TableHead>Creat</TableHead>
            <TableHead className="text-right">Acțiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((reminder) => (
            <TableRow key={reminder.id}>
              <TableCell className="font-medium">
                {reminder.plate_number}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {getReminderTypeLabel(reminder.reminder_type)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className={
                    isExpired(reminder.expiry_date)
                      ? 'text-destructive font-medium'
                      : isExpiringSoon(reminder.expiry_date)
                      ? 'text-warning font-medium'
                      : ''
                  }>
                    {format(new Date(reminder.expiry_date), 'dd MMM yyyy', { locale: ro })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reminder.expiry_date), {
                      addSuffix: true,
                      locale: ro,
                    })}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {reminder.guest_phone || '-'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {reminder.guest_name || '-'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(reminder.created_at), {
                  addSuffix: true,
                  locale: ro,
                })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSendSMS(reminder)}
                    title="Trimite SMS"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(reminder)}
                    title="Editează"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(reminder)}
                    title="Șterge"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
