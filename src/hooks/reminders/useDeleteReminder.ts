import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { Database } from '@/types';
import { useToast } from '@/hooks/useToast';
import { remindersKeys } from './useReminders';

type Reminder = Database['public']['Tables']['reminders']['Row'];

export interface DeleteReminderInput {
  id: string;
  permanent?: boolean; // If true, actually delete; if false, soft delete
}

interface DeleteReminderContext {
  previousReminder?: Reminder;
  previousList?: Reminder[];
}

/**
 * React Query mutation hook for deleting a reminder
 *
 * Features:
 * - Soft delete by default (sets deleted_at timestamp)
 * - Optional permanent deletion
 * - Optimistic updates
 * - Cache cleanup
 * - Toast notifications
 * - Confirmation requirement (implement in UI)
 *
 * @example
 * ```tsx
 * const deleteReminder = useDeleteReminder();
 *
 * // Soft delete
 * deleteReminder.mutate({ id: 'reminder-id' });
 *
 * // Permanent delete
 * deleteReminder.mutate({ id: 'reminder-id', permanent: true });
 * ```
 */
export function useDeleteReminder(
  options?: Omit<
    UseMutationOptions<void, Error, DeleteReminderInput, DeleteReminderContext>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, DeleteReminderInput, DeleteReminderContext>({
    mutationFn: async ({ id, permanent = false }) => {
      const supabase = createBrowserClient();

      if (!id) {
        throw new Error('Reminder ID is required');
      }

      if (permanent) {
        // Permanent deletion
        const { error } = await supabase
          .from('reminders')
          .delete()
          .eq('id', id);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        // Soft delete - set deleted_at timestamp
        const { error } = await supabase
          .from('reminders')
          .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {
          throw new Error(error.message);
        }
      }
    },
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: remindersKeys.all });

      // Snapshot previous values
      const previousReminder = queryClient.getQueryData<Reminder>(
        remindersKeys.detail(id)
      );
      const previousList = queryClient.getQueryData<Reminder[]>(remindersKeys.all);

      // Optimistically remove from cache
      queryClient.setQueriesData<Reminder[]>(
        { queryKey: remindersKeys.lists() },
        (old) => {
          if (!old) return old;
          return old.filter((reminder) => reminder.id !== id);
        }
      );

      // Remove detail cache
      queryClient.removeQueries({ queryKey: remindersKeys.detail(id) });

      return { previousReminder, previousList };
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: remindersKeys.all });

      // Show success toast
      toast({
        title: 'Reminder Deleted',
        description: variables.permanent
          ? 'Reminder has been permanently deleted.'
          : 'Reminder has been moved to trash.',
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
        title: 'Error Deleting Reminder',
        description: error.message || 'Failed to delete reminder. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: remindersKeys.all });
    },
    ...options,
  });
}

/**
 * Hook for restoring a soft-deleted reminder
 */
export function useRestoreReminder(
  options?: Omit<
    UseMutationOptions<Reminder, Error, string, DeleteReminderContext>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Reminder, Error, string, DeleteReminderContext>({
    mutationFn: async (id) => {
      const supabase = createBrowserClient();

      if (!id) {
        throw new Error('Reminder ID is required');
      }

      const { data, error } = await supabase
        .from('reminders')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
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
    onSuccess: (data) => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: remindersKeys.all });

      toast({
        title: 'Reminder Restored',
        description: `Reminder for ${data.plate_number} has been restored.`,
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Restoring Reminder',
        description: error.message || 'Failed to restore reminder. Please try again.',
        variant: 'destructive',
      });
    },
    ...options,
  });
}

/**
 * Hook for batch deleting multiple reminders
 */
export function useDeleteReminders(
  options?: Omit<
    UseMutationOptions<void, Error, DeleteReminderInput[], DeleteReminderContext>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, DeleteReminderInput[], DeleteReminderContext>({
    mutationFn: async (inputs) => {
      const supabase = createBrowserClient();
      const ids = inputs.map((input) => input.id);
      const permanent = inputs[0]?.permanent || false;

      if (permanent) {
        // Permanent deletion
        const { error } = await supabase
          .from('reminders')
          .delete()
          .in('id', ids);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        // Soft delete
        const { error } = await supabase
          .from('reminders')
          .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', ids);

        if (error) {
          throw new Error(error.message);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: remindersKeys.all });

      toast({
        title: 'Reminders Deleted',
        description: `${variables.length} reminder(s) have been deleted.`,
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Deleting Reminders',
        description: error.message || 'Failed to delete reminders. Please try again.',
        variant: 'destructive',
      });
    },
    ...options,
  });
}
