import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { Database } from '@/types';
import { useToast } from '@/hooks/useToast';
import { remindersKeys } from './useReminders';

type ReminderInsert = Database['public']['Tables']['reminders']['Insert'];
type Reminder = Database['public']['Tables']['reminders']['Row'];

export interface CreateReminderInput {
  user_id?: string | null;
  guest_phone?: string | null;
  guest_name?: string | null;
  plate_number: string;
  reminder_type: 'itp' | 'rca' | 'rovinieta';
  expiry_date: string;
  notification_intervals?: number[];
  notification_channels?: string[];
  source: 'web' | 'kiosk' | 'whatsapp' | 'voice' | 'import';
  station_id?: string | null;
  consent_given?: boolean;
  consent_ip?: string | null;
}

interface CreateReminderContext {
  previousReminders?: Reminder[];
}

/**
 * React Query mutation hook for creating a new reminder
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Toast notifications
 * - Error handling with rollback
 *
 * @example
 * ```tsx
 * const createReminder = useCreateReminder();
 *
 * createReminder.mutate({
 *   plate_number: 'B123ABC',
 *   reminder_type: 'itp',
 *   expiry_date: '2024-12-31',
 *   source: 'web',
 *   consent_given: true
 * });
 * ```
 */
export function useCreateReminder(
  options?: Omit<
    UseMutationOptions<Reminder, Error, CreateReminderInput, CreateReminderContext>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Reminder, Error, CreateReminderInput, CreateReminderContext>({
    mutationFn: async (input) => {
      const supabase = createBrowserClient();

      // Validate required fields
      if (!input.plate_number) {
        throw new Error('Plate number is required');
      }
      if (!input.expiry_date) {
        throw new Error('Expiry date is required');
      }
      if (!input.source) {
        throw new Error('Source is required');
      }

      // Prepare insert data
      const reminderData: ReminderInsert = {
        user_id: input.user_id,
        guest_phone: input.guest_phone,
        guest_name: input.guest_name,
        plate_number: input.plate_number.toUpperCase().trim(),
        reminder_type: input.reminder_type || 'itp',
        expiry_date: input.expiry_date,
        notification_intervals: input.notification_intervals || [5, 3, 1],
        notification_channels: input.notification_channels || ['sms'],
        source: input.source,
        station_id: input.station_id,
        consent_given: input.consent_given ?? false,
        consent_timestamp: input.consent_given ? new Date().toISOString() : null,
        consent_ip: input.consent_ip,
      };

      const { data, error } = await supabase
        .from('reminders')
        .insert(reminderData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Failed to create reminder');
      }

      return data;
    },
    onMutate: async (newReminder) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: remindersKeys.all });

      // Snapshot previous value
      const previousReminders = queryClient.getQueryData<Reminder[]>(remindersKeys.all);

      // Optimistically update cache with temporary ID
      const optimisticReminder: Reminder = {
        id: `temp-${Date.now()}`,
        user_id: newReminder.user_id || null,
        guest_phone: newReminder.guest_phone || null,
        guest_name: newReminder.guest_name || null,
        plate_number: newReminder.plate_number.toUpperCase().trim(),
        reminder_type: newReminder.reminder_type || 'itp',
        expiry_date: newReminder.expiry_date,
        notification_intervals: newReminder.notification_intervals || [5, 3, 1],
        notification_channels: newReminder.notification_channels || ['sms'],
        last_notification_sent_at: null,
        next_notification_date: null,
        source: newReminder.source,
        station_id: newReminder.station_id || null,
        consent_given: newReminder.consent_given ?? false,
        consent_timestamp: newReminder.consent_given ? new Date().toISOString() : null,
        consent_ip: newReminder.consent_ip || null,
        opt_out: false,
        opt_out_timestamp: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update cache
      queryClient.setQueryData<Reminder[]>(remindersKeys.all, (old) => {
        if (!old) return [optimisticReminder];
        return [optimisticReminder, ...old];
      });

      return { previousReminders };
    },
    onSuccess: (data) => {
      // Invalidate all reminder queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: remindersKeys.all });

      // Show success toast
      toast({
        title: 'Reminder Created',
        description: `Reminder for ${data.plate_number} has been created successfully.`,
        variant: 'default',
      });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousReminders) {
        queryClient.setQueryData(remindersKeys.all, context.previousReminders);
      }

      // Show error toast
      toast({
        title: 'Error Creating Reminder',
        description: error.message || 'Failed to create reminder. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: remindersKeys.all });
    },
    ...options,
  });
}

/**
 * Hook for batch creating multiple reminders
 */
export function useCreateReminders(
  options?: Omit<
    UseMutationOptions<Reminder[], Error, CreateReminderInput[], CreateReminderContext>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Reminder[], Error, CreateReminderInput[], CreateReminderContext>({
    mutationFn: async (inputs) => {
      const supabase = createBrowserClient();

      // Prepare all insert data
      const remindersData: ReminderInsert[] = inputs.map((input) => ({
        user_id: input.user_id,
        guest_phone: input.guest_phone,
        guest_name: input.guest_name,
        plate_number: input.plate_number.toUpperCase().trim(),
        reminder_type: input.reminder_type || 'itp',
        expiry_date: input.expiry_date,
        notification_intervals: input.notification_intervals || [5, 3, 1],
        notification_channels: input.notification_channels || ['sms'],
        source: input.source,
        station_id: input.station_id,
        consent_given: input.consent_given ?? false,
        consent_timestamp: input.consent_given ? new Date().toISOString() : null,
        consent_ip: input.consent_ip,
      }));

      const { data, error } = await supabase
        .from('reminders')
        .insert(remindersData)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: remindersKeys.all });

      toast({
        title: 'Reminders Created',
        description: `${data.length} reminder(s) have been created successfully.`,
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Creating Reminders',
        description: error.message || 'Failed to create reminders. Please try again.',
        variant: 'destructive',
      });
    },
    ...options,
  });
}
