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
import { Filter, RotateCw, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface Notification {
  id: string;
  reminder_id: string | null;
  provider: string;
  provider_message_id: string | null;
  recipient: string;
  message_content: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  reminders?: { plate_number: string } | null;
}

interface NotificationsTableProps {
  notifications: Notification[];
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  scheduled: 'secondary',
  sent: 'default',
  delivered: 'default',
  failed: 'destructive',
  undelivered: 'destructive',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Programat',
  sent: 'Trimis',
  delivered: 'Livrat',
  failed: 'Eșuat',
  undelivered: 'Nelivrat',
};

export function NotificationsTable({ notifications }: NotificationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const currentStatus = searchParams.get('status') || 'all';

  // Filter notifications by search term
  const filteredNotifications = notifications.filter((notification) =>
    notification.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    router.push(`/admin/notifications?${params.toString()}`);
  };

  const handleResend = async (notificationId: string) => {
    setResendingId(notificationId);
    try {
      const response = await fetch('/api/notifications/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notificationId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Eroare la retrimitere');
      }

      toast({
        title: 'Notificare retrimisă',
        description: 'Notificarea a fost retrimisă cu succes',
        variant: 'success',
      });

      router.refresh();
    } catch (error) {
      toast({
        title: 'Eroare',
        description: error instanceof Error ? error.message : 'A apărut o eroare',
        variant: 'destructive',
      });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Button
            variant={currentStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange('all')}
          >
            Toate
          </Button>
          <Button
            variant={currentStatus === 'sent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange('sent')}
          >
            Trimise
          </Button>
          <Button
            variant={currentStatus === 'delivered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange('delivered')}
          >
            Livrate
          </Button>
          <Button
            variant={currentStatus === 'failed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange('failed')}
          >
            Eșuate
          </Button>
        </div>

        <Input
          placeholder="Caută după număr telefon..."
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
              <TableHead>Destinatar</TableHead>
              <TableHead>Număr Auto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Trimis La</TableHead>
              <TableHead>Eroare</TableHead>
              <TableHead className="text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNotifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'Nu s-au găsit notificări' : 'Nu există notificări'}
                </TableCell>
              </TableRow>
            ) : (
              filteredNotifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="font-medium">{notification.recipient}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {notification.reminders?.plate_number || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[notification.status] || 'secondary'}>
                      {statusLabels[notification.status] || notification.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{notification.provider}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {notification.sent_at
                      ? format(new Date(notification.sent_at), 'dd MMM yyyy HH:mm', {
                          locale: ro,
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {notification.error_message ? (
                      <div className="flex items-center gap-2 text-error text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span className="truncate max-w-[200px]" title={notification.error_message}>
                          {notification.error_message}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {(notification.status === 'failed' || notification.status === 'undelivered') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(notification.id)}
                        disabled={resendingId === notification.id}
                      >
                        <RotateCw
                          className={`h-4 w-4 mr-2 ${
                            resendingId === notification.id ? 'animate-spin' : ''
                          }`}
                        />
                        Retrimite
                      </Button>
                    )}
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
