'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Mail, MessageSquare, Check, X, Clock, AlertCircle, Bell } from 'lucide-react';

interface Notification {
  id: string;
  channel: string;
  recipient: string;
  message_body: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  retry_count: number | null;
  estimated_cost: number | null;
  created_at: string;
  reminders?: {
    plate_number: string;
  } | null;
}

interface NotificationsTableProps {
  notifications: Notification[];
  currentPage: number;
  totalPages: number;
  currentFilters: {
    status: string;
    channel: string;
  };
}

export function NotificationsTable({
  notifications,
  currentPage,
  totalPages,
  currentFilters,
}: NotificationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page'); // Reset to page 1 when filtering
    router.push(`/admin/notifications?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/admin/notifications?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
            <Check className="w-3 h-3" />
            {status === 'delivered' ? 'Livrat' : 'Trimis'}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
            <X className="w-3 h-3" />
            Eșuat
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300">
            <Clock className="w-3 h-3" />
            În așteptare
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return <MessageSquare className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-card border rounded-lg">
      {/* Filters */}
      <div className="border-b p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={currentFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Toate</option>
              <option value="pending">În așteptare</option>
              <option value="sent">Trimis</option>
              <option value="delivered">Livrat</option>
              <option value="failed">Eșuat</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Canal</label>
            <select
              value={currentFilters.channel}
              onChange={(e) => handleFilterChange('channel', e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Toate</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="ml-auto">
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold">{notifications.length}</span> notificări
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">Nu există notificări pentru acest filtru</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold text-sm">Canal</th>
                <th className="text-left p-4 font-semibold text-sm">Destinatar</th>
                <th className="text-left p-4 font-semibold text-sm">Vehicul</th>
                <th className="text-left p-4 font-semibold text-sm">Mesaj</th>
                <th className="text-left p-4 font-semibold text-sm">Status</th>
                <th className="text-left p-4 font-semibold text-sm">Trimis</th>
                <th className="text-left p-4 font-semibold text-sm">Cost</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id} className="border-t hover:bg-muted/20">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(notification.channel)}
                      <span className="text-sm font-medium capitalize">{notification.channel}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-mono">{notification.recipient}</span>
                  </td>
                  <td className="p-4">
                    {notification.reminders?.plate_number ? (
                      <span className="text-sm font-mono font-medium">
                        {notification.reminders.plate_number}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </td>
                  <td className="p-4 max-w-xs">
                    <p className="text-sm text-muted-foreground truncate" title={notification.message_body}>
                      {notification.message_body}
                    </p>
                    {notification.error_message && (
                      <p className="text-xs text-red-600 mt-1" title={notification.error_message}>
                        Error: {notification.error_message}
                      </p>
                    )}
                  </td>
                  <td className="p-4">{getStatusBadge(notification.status)}</td>
                  <td className="p-4">
                    <div className="text-sm">
                      {notification.sent_at ? (
                        <>
                          <div>{new Date(notification.sent_at).toLocaleDateString('ro-RO')}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(notification.sent_at).toLocaleTimeString('ro-RO')}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {notification.estimated_cost ? (
                      <span className="text-sm font-medium">
                        {Number(notification.estimated_cost).toFixed(4)} RON
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t p-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Pagina {currentPage} din {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Înapoi
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Înainte
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
