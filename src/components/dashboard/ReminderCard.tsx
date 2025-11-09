'use client';

import { useState } from 'react';
import { Calendar, Car, Bell, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { EditReminderDialog } from './EditReminderDialog';

interface Reminder {
  id: string;
  plate_number: string;
  itp_expiry_date: string;
  sms_notifications_enabled: boolean;
  station_slug?: string;
  status: string;
}

interface ReminderCardProps {
  reminder: Reminder;
  onUpdate: () => void;
}

export function ReminderCard({ reminder, onUpdate }: ReminderCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingNotification, setIsTogglingNotification] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const expiryDate = new Date(reminder.itp_expiry_date);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpired = daysUntilExpiry < 0;
  const isUrgent = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  const isUpcoming = daysUntilExpiry > 7 && daysUntilExpiry <= 30;

  const handleDelete = async () => {
    if (!confirm('Sigur vrei să ștergi acest reminder?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      onUpdate();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Eroare la ștergere. Te rugăm să încerci din nou.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleNotification = async () => {
    setIsTogglingNotification(true);
    try {
      const response = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sms_notifications_enabled: !reminder.sms_notifications_enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle notification');
      }

      onUpdate();
    } catch (error) {
      console.error('Toggle notification error:', error);
      alert('Eroare la modificare. Te rugăm să încerci din nou.');
    } finally {
      setIsTogglingNotification(false);
    }
  };

  return (
    <>
      <div
        className={`bg-card border rounded-lg p-6 ${
          isExpired
            ? 'border-red-500'
            : isUrgent
            ? 'border-yellow-500'
            : isUpcoming
            ? 'border-blue-500'
            : ''
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <div className="flex gap-2">
            {isExpired && (
              <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 text-xs font-medium rounded">
                Expirat
              </span>
            )}
            {isUrgent && !isExpired && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 text-xs font-medium rounded">
                Urgent
              </span>
            )}
            {isUpcoming && !isUrgent && !isExpired && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium rounded">
                Curând
              </span>
            )}
          </div>
        </div>

        <h3 className="text-xl font-bold font-mono mb-2">
          {reminder.plate_number}
        </h3>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Expiră: {format(expiryDate, 'dd MMM yyyy', { locale: ro })}
            </span>
          </div>

          {!isExpired && (
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span
                className={
                  isUrgent
                    ? 'text-yellow-600 font-medium'
                    : 'text-muted-foreground'
                }
              >
                {daysUntilExpiry === 0
                  ? 'Expiră astăzi!'
                  : daysUntilExpiry === 1
                  ? 'Expiră mâine!'
                  : `${daysUntilExpiry} zile rămase`}
              </span>
            </div>
          )}

          {isExpired && (
            <div className="flex items-center gap-2 text-red-600">
              <Bell className="w-4 h-4" />
              <span className="font-medium">
                Expirat acum {Math.abs(daysUntilExpiry)} zile
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {reminder.sms_notifications_enabled ? (
              <ToggleRight className="w-4 h-4 text-green-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-muted-foreground">
              SMS: {reminder.sms_notifications_enabled ? 'Activate' : 'Dezactivate'}
            </span>
          </div>
        </div>

        {reminder.station_slug && (
          <div className="mb-4 pb-4 border-t pt-4 text-xs text-muted-foreground">
            Înregistrat prin: {reminder.station_slug}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit className="w-3 h-3 mr-1" />
            Editează
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleNotification}
            disabled={isTogglingNotification}
          >
            {reminder.sms_notifications_enabled ? (
              <ToggleLeft className="w-4 h-4" />
            ) : (
              <ToggleRight className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <EditReminderDialog
        reminder={reminder}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onUpdate={onUpdate}
      />
    </>
  );
}
