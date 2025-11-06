'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createReminderSchema, type CreateReminder } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

interface ReminderFormProps {
  initialData?: Partial<CreateReminder>;
  onSubmit: (data: CreateReminder) => Promise<void>;
  isEdit?: boolean;
}

export function ReminderForm({ initialData, onSubmit, isEdit = false }: ReminderFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateReminder>({
    resolver: zodResolver(createReminderSchema) as any,
    defaultValues: {
      reminder_type: 'itp',
      notification_intervals: [7, 3, 1],
      notification_channels: {
        sms: true,
        email: false,
      },
      ...initialData,
    },
  });

  const reminderType = watch('reminder_type');
  const notificationChannels = watch('notification_channels');

  const handleFormSubmit = async (data: CreateReminder) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
      router.push('/dashboard/reminders');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('A apărut o eroare. Vă rugăm să încercați din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalii vehicul</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plate Number */}
          <div className="space-y-2">
            <Label htmlFor="plate_number">Număr înmatriculare *</Label>
            <Input
              id="plate_number"
              placeholder="XX-123-ABC"
              {...register('plate_number')}
              className={errors.plate_number ? 'border-red-500' : ''}
            />
            {errors.plate_number && (
              <p className="text-sm text-red-500">{errors.plate_number.message}</p>
            )}
          </div>

          {/* Reminder Type */}
          <div className="space-y-2">
            <Label htmlFor="reminder_type">Tip reminder *</Label>
            <Select
              value={reminderType}
              onValueChange={(value) => setValue('reminder_type', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="itp">ITP</SelectItem>
                <SelectItem value="rca">RCA</SelectItem>
                <SelectItem value="rovinieta">Rovinieta</SelectItem>
              </SelectContent>
            </Select>
            {errors.reminder_type && (
              <p className="text-sm text-red-500">{errors.reminder_type.message}</p>
            )}
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiry_date">Data expirării *</Label>
            <Input
              id="expiry_date"
              type="date"
              {...register('expiry_date')}
              className={errors.expiry_date ? 'border-red-500' : ''}
            />
            {errors.expiry_date && (
              <p className="text-sm text-red-500">{errors.expiry_date.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setări notificări</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notification Channels */}
          <div className="space-y-3">
            <Label>Canale de notificare</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sms"
                checked={notificationChannels?.sms}
                onCheckedChange={(checked) =>
                  setValue('notification_channels.sms', checked as boolean)
                }
              />
              <Label htmlFor="sms" className="font-normal cursor-pointer">
                SMS
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="email"
                checked={notificationChannels?.email}
                onCheckedChange={(checked) =>
                  setValue('notification_channels.email', checked as boolean)
                }
              />
              <Label htmlFor="email" className="font-normal cursor-pointer">
                Email
              </Label>
            </div>
          </div>

          {/* Guest Info (optional) */}
          <div className="space-y-2">
            <Label htmlFor="guest_name">Nume (opțional)</Label>
            <Input id="guest_name" placeholder="Ion Popescu" {...register('guest_name')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_phone">Telefon (opțional)</Label>
            <Input
              id="guest_phone"
              placeholder="+40712345678"
              {...register('guest_phone')}
              className={errors.guest_phone ? 'border-red-500' : ''}
            />
            {errors.guest_phone && (
              <p className="text-sm text-red-500">{errors.guest_phone.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Anulează
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Se salvează...' : isEdit ? 'Actualizează' : 'Creează'}
        </Button>
      </div>
    </form>
  );
}
