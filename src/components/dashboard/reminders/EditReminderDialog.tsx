'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useUpdateReminder } from '@/hooks/reminders/useUpdateReminder';
import { Database } from '@/types';
import { phoneSchema, plateNumberSchema, reminderTypeSchema } from '@/lib/validation';

type Reminder = Database['public']['Tables']['reminders']['Row'];

// Validation schema for edit reminder form - using centralized schemas
const editReminderSchema = z.object({
  plate_number: plateNumberSchema,
  reminder_type: reminderTypeSchema,
  expiry_date: z.string().min(1, 'Expiry date is required'),
  station_id: z.string().optional().nullable(),
  guest_phone: phoneSchema.optional().or(z.literal('')),
  guest_name: z.string().min(3, 'Name must be at least 3 characters').optional().or(z.literal('')),
});

type EditReminderFormData = z.infer<typeof editReminderSchema>;

interface EditReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder | null;
}

export function EditReminderDialog({
  open,
  onOpenChange,
  reminder,
}: EditReminderDialogProps) {
  const updateReminder = useUpdateReminder();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<EditReminderFormData>({
    resolver: zodResolver(editReminderSchema),
  });

  const reminderType = watch('reminder_type');

  // Update form when reminder changes
  React.useEffect(() => {
    if (reminder) {
      reset({
        plate_number: reminder.plate_number,
        reminder_type: reminder.reminder_type,
        expiry_date: reminder.expiry_date && reminder.expiry_date.includes('T')
          ? reminder.expiry_date.split('T')[0]
          : reminder.expiry_date || '', // Format date for input
        station_id: reminder.station_id,
        guest_phone: reminder.guest_phone || '',
        guest_name: reminder.guest_name || '',
      });
    }
  }, [reminder, reset]);

  const onSubmit = async (data: EditReminderFormData) => {
    if (!reminder) return;

    try {
      await updateReminder.mutateAsync({
        id: reminder.id,
        plate_number: data.plate_number,
        expiry_date: data.expiry_date,
      });

      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to update reminder:', error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!reminder) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Reminder</DialogTitle>
          <DialogDescription>
            Update reminder details for {reminder.plate_number}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Plate Number */}
          <div className="space-y-2">
            <Label htmlFor="plate_number" className="text-sm font-medium">
              Plate Number *
            </Label>
            <Input
              id="plate_number"
              placeholder="B-123-ABC"
              {...register('plate_number')}
              error={errors.plate_number?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Reminder Type */}
          <div className="space-y-2">
            <Label htmlFor="reminder_type" className="text-sm font-medium">
              Reminder Type *
            </Label>
            <Select
              value={reminderType}
              onValueChange={(value) =>
                setValue('reminder_type', value as 'itp' | 'rca' | 'rovinieta')
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="reminder_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="itp">ITP (Technical Inspection)</SelectItem>
                <SelectItem value="rca">RCA (Insurance)</SelectItem>
                <SelectItem value="rovinieta">Rovinieta (Road Tax)</SelectItem>
              </SelectContent>
            </Select>
            {errors.reminder_type && (
              <p className="text-sm text-red-500">{errors.reminder_type.message}</p>
            )}
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiry_date" className="text-sm font-medium">
              Expiry Date *
            </Label>
            <Input
              id="expiry_date"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              {...register('expiry_date')}
              error={errors.expiry_date?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Guest Phone (optional) */}
          <div className="space-y-2">
            <Label htmlFor="guest_phone" className="text-sm font-medium">
              Alternative Phone (optional)
            </Label>
            <Input
              id="guest_phone"
              type="tel"
              placeholder="+40712345678"
              {...register('guest_phone')}
              error={errors.guest_phone?.message}
              disabled={isSubmitting}
            />
          </div>

          {/* Guest Name (optional) */}
          <div className="space-y-2">
            <Label htmlFor="guest_name" className="text-sm font-medium">
              Guest Name (optional)
            </Label>
            <Input
              id="guest_name"
              placeholder="John Doe"
              {...register('guest_name')}
              error={errors.guest_name?.message}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Reminder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
