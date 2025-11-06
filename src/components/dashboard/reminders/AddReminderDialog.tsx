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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useCreateReminder } from '@/hooks/reminders/useCreateReminder';

// Validation schema for add reminder form
const addReminderSchema = z.object({
  plate_number: z
    .string()
    .min(1, 'Plate number is required')
    .regex(
      /^[A-Z]{1,2}-\d{2,3}-[A-Z]{3}$/i,
      'Invalid plate format (e.g., B-123-ABC)'
    )
    .transform((val) => val.toUpperCase()),
  reminder_type: z.enum(['itp', 'rca', 'rovinieta'], {
    required_error: 'Please select a reminder type',
  }),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  station_id: z.string().optional().nullable(),
  guest_phone: z
    .string()
    .regex(/^\+40\d{9}$/, 'Phone must be in format +40XXXXXXXXX')
    .optional()
    .or(z.literal('')),
  guest_name: z.string().min(3, 'Name must be at least 3 characters').optional().or(z.literal('')),
});

type AddReminderFormData = z.infer<typeof addReminderSchema>;

interface AddReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationId?: string | null;
}

export function AddReminderDialog({
  open,
  onOpenChange,
  stationId,
}: AddReminderDialogProps) {
  const createReminder = useCreateReminder();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<AddReminderFormData>({
    resolver: zodResolver(addReminderSchema),
    defaultValues: {
      reminder_type: 'itp',
      station_id: stationId || null,
      guest_phone: '',
      guest_name: '',
    },
  });

  const reminderType = watch('reminder_type');

  const onSubmit = async (data: AddReminderFormData) => {
    try {
      await createReminder.mutateAsync({
        plate_number: data.plate_number,
        reminder_type: data.reminder_type,
        expiry_date: data.expiry_date,
        station_id: data.station_id || null,
        guest_phone: data.guest_phone || null,
        guest_name: data.guest_name || null,
        source: 'web',
      });

      reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Failed to create reminder:', error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Reminder</DialogTitle>
          <DialogDescription>
            Create a new reminder for vehicle inspection or insurance expiry.
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
              {isSubmitting ? 'Creating...' : 'Create Reminder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
