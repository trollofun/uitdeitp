'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/button';
import { useDeleteReminder } from '@/hooks/reminders/useDeleteReminder';
import { Database } from '@/types';
import { AlertCircle } from 'lucide-react';

type Reminder = Database['public']['Tables']['reminders']['Row'];

interface DeleteReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder | null;
}

export function DeleteReminderDialog({
  open,
  onOpenChange,
  reminder,
}: DeleteReminderDialogProps) {
  const deleteReminder = useDeleteReminder();

  const handleDelete = async () => {
    if (!reminder) return;

    try {
      await deleteReminder.mutateAsync({ id: reminder.id });
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to delete reminder:', error);
    }
  };

  if (!reminder) return null;

  // Format expiry date for display
  const expiryDate = new Date(reminder.expiry_date).toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get reminder type label
  const reminderTypeLabel = {
    itp: 'ITP (Technical Inspection)',
    rca: 'RCA (Insurance)',
    rovinieta: 'Rovinieta (Road Tax)',
  }[reminder.reminder_type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Delete Reminder
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the reminder.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">Plate Number:</span>
              <span className="text-sm font-semibold text-gray-900">
                {reminder.plate_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">Type:</span>
              <span className="text-sm text-gray-900">{reminderTypeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-700">Expiry Date:</span>
              <span className="text-sm text-gray-900">{expiryDate}</span>
            </div>
            {reminder.guest_name && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Guest Name:</span>
                <span className="text-sm text-gray-900">{reminder.guest_name}</span>
              </div>
            )}
            {reminder.guest_phone && (
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Guest Phone:</span>
                <span className="text-sm text-gray-900">{reminder.guest_phone}</span>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This reminder will be permanently deleted and cannot be
              recovered. Any scheduled notifications will be cancelled.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteReminder.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteReminder.isPending}
          >
            {deleteReminder.isPending ? 'Deleting...' : 'Delete Reminder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
