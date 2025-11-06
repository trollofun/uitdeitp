import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { Database } from '@/types';
import { useToast } from '@/hooks/useToast';
import { remindersKeys } from './useReminders';

type ReminderUpdate = Database['public']['Tables']['reminders']['Update'];
type Reminder = Database['public']['Tables']['reminders']['Row'];

export interface UpdateReminderInput {
  id: string;
  plate_number?: string;
  expiry_date?: string;
  notification_intervals?: number[];
  notification_channels?: string[];
  opt_out?: boolean;
}

interface UpdateReminderContext {
  previousReminder?: Reminder;
  previousList?: Reminder[];
}

/**
 * React Query mutation hook for updating a reminder
 *
 * Features:
 * - Optimistic updates with rollback on error
 * - Automatic cache updates
 * - Toast notifications
 * - Type-safe updates
 *
 * @example
 * ```tsx
 * const updateReminder = useUpdateReminder();
 *
 * updateReminder.mutate({
 *   id: 'reminder-id',
 *   plate_number: 'B456DEF',
 *   expiry_date: '2025-01-15'
 * });
 * ```
 */
export function useUpdateReminder(
  options?: Omit<
    UseMutationOptions<Reminder, Error, UpdateReminderInput, UpdateReminderContext>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Reminder, Error, UpdateReminderInput, UpdateReminderContext>({
    mutationFn: async (input) => {
      const supabase = createBrowserClient();

      if (!input.id) {
        throw new Error('Reminder ID is required');
      }

      // Prepare update data
      const updateData: ReminderUpdate = {
        updated_at: new Date().toISOString(),
      };

      if (input.plate_number !== undefined) {
        updateData.plate_number = input.plate_number.toUpperCase().trim();
      }
      if (input.expiry_date !== undefined) {
        updateData.expiry_date = input.expiry_date;
      }
      if (input.notification_intervals !== undefined) {
        updateData.notification_intervals = input.notification_intervals;
      }
      if (input.notification_channels !== undefined) {
        updateData.notification_channels = input.notification_channels;
      }
      if (input.opt_out !== undefined) {
        updateData.opt_out = input.opt_out;
        if (input.opt_out) {
          updateData.opt_out_timestamp = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Reminder not found');
      }

      return data;
    },
    onMutate: async (updatedReminder) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: remindersKeys.all });

      // Snapshot previous values
      const previousReminder = queryClient.getQueryData<Reminder>(
        remindersKeys.detail(updatedReminder.id)
      );
      const previousList = queryClient.getQueryData<Reminder[]>(remindersKeys.all);

      // Optimistically update detail cache
      queryClient.setQueryData<Reminder>(
        remindersKeys.detail(updatedReminder.id),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            ...updatedReminder,
            plate_number: updatedReminder.plate_number?.toUpperCase().trim() || old.plate_number,
            updated_at: new Date().toISOString(),
            opt_out_timestamp: updatedReminder.opt_out
              ? new Date().toISOString()
              : old.opt_out_timestamp,
          };
        }
      );

      // Optimistically update list cache
      queryClient.setQueriesData<Reminder[]>(
        { queryKey: remindersKeys.lists() },
        (old) => {
          if (!old) return old;
          return old.map((reminder) =>
            reminder.id === updatedReminder.id
              ? {
                  ...reminder,
                  ...updatedReminder,
                  plate_number: updatedReminder.plate_number?.toUpperCase().trim() || reminder.plate_number,
                  updated_at: new Date().toISOString(),
                  opt_out_timestamp: updatedReminder.opt_out
                    ? new Date().toISOString()
                    : reminder.opt_out_timestamp,
                }
              : reminder
          );
        }
      );

      return { previousReminder, previousList };
    },
    onSuccess: (data, variables) => {
      // Update specific reminder cache
      queryClient.setQueryData(remindersKeys.detail(variables.id), data);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: remindersKeys.lists() });

      // Show success toast
      toast({
        title: 'Reminder Updated',
        description: `Reminder for ${data.plate_number} has been updated successfully.`,
        variant: 'default',
      });
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousReminder) {
        queryClient.setQueryData(
          remindersKeys.detail(variables.id),
          context.previousReminder
        );
      }
      if (context?.previousList) {
        queryClient.setQueryData(remindersKeys.all, context.previousList);
      }

      // Show error toast
      toast({
        title: 'Error Updating Reminder',
        description: error.message || 'Failed to update reminder. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: remindersKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: remindersKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook for toggling reminder opt-out status
 */
export function useToggleReminderOptOut(
  options?: Omit<
    UseMutationOptions<Reminder, Error, { id: string; optOut: boolean }, UpdateReminderContext>,
    'mutationFn'
  >
) {
  const updateReminder = useUpdateReminder();

  return useMutation<Reminder, Error, { id: string; optOut: boolean }, UpdateReminderContext>({
    mutationFn: async ({ id, optOut }) => {
      return updateReminder.mutateAsync({
        id,
        opt_out: optOut,
      });
    },
    ...options,
  });
}

/**
 * Hook for updating notification settings
 */
export function useUpdateNotificationSettings(
  options?: Omit<
    UseMutationOptions<
      Reminder,
      Error,
      { id: string; intervals: number[]; channels: string[] },
      UpdateReminderContext
    >,
    'mutationFn'
  >
) {
  const updateReminder = useUpdateReminder();

  return useMutation<
    Reminder,
    Error,
    { id: string; intervals: number[]; channels: string[] },
    UpdateReminderContext
  >({
    mutationFn: async ({ id, intervals, channels }) => {
      return updateReminder.mutateAsync({
        id,
        notification_intervals: intervals,
        notification_channels: channels,
      });
    },
    ...options,
  });
}
