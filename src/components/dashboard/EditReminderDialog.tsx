'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface Reminder {
  id: string;
  plate_number: string;
  itp_expiry_date: string;
  sms_notifications_enabled: boolean;
}

interface EditReminderDialogProps {
  reminder: Reminder;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditReminderDialog({
  reminder,
  open,
  onClose,
  onUpdate,
}: EditReminderDialogProps) {
  const [expiryDate, setExpiryDate] = useState(
    reminder.itp_expiry_date.split('T')[0]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const response = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itp_expiry_date: expiryDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      setError('Eroare la salvare. Te rugăm să încerci din nou.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Editează Reminder</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Număr Înmatriculare
            </label>
            <Input
              type="text"
              value={reminder.plate_number}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Numărul de înmatriculare nu poate fi modificat
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Data Expirării ITP
            </label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSaving}
            >
              Anulează
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSaving}
            >
              {isSaving ? 'Se salvează...' : 'Salvează'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
