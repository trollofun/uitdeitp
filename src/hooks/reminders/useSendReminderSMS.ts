import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { Database } from '@/types';
import { useToast } from '@/hooks/useToast';
import { remindersKeys } from './useReminders';

type Reminder = Database['public']['Tables']['reminders']['Row'];

export interface SendReminderSMSInput {
  reminder_id: string;
  phone_number?: string; // Optional override
  message?: string; // Optional custom message
  template?: '5d' | '3d' | '1d'; // Template to use
}

export interface SendSMSResponse {
  success: boolean;
  messageId?: string;
  provider?: 'calisero' | 'twilio';
  parts?: number;
  estimatedCost?: number;
  error?: string;
}

interface SendSMSContext {
  previousReminder?: Reminder;
}

/**
 * React Query mutation hook for sending SMS reminders
 *
 * Features:
 * - Rate limiting awareness (via API response)
 * - Success/error notifications
 * - Cost estimation display
 * - Template support
 * - Cache updates after successful send
 *
 * @example
 * ```tsx
 * const sendSMS = useSendReminderSMS();
 *
 * sendSMS.mutate({
 *   reminder_id: 'reminder-id',
 *   template: '3d'
 * });
 * ```
 */
export function useSendReminderSMS(
  options?: Omit<
    UseMutationOptions<SendSMSResponse, Error, SendReminderSMSInput, SendSMSContext>,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<SendSMSResponse, Error, SendReminderSMSInput, SendSMSContext>({
    mutationFn: async (input) => {
      if (!input.reminder_id) {
        throw new Error('Reminder ID is required');
      }

      // Call the SMS API endpoint
      const response = await fetch('/api/notifications/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminder_id: input.reminder_id,
          phone_number: input.phone_number,
          message: input.message,
          template: input.template,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send SMS');
      }

      const data: SendSMSResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send SMS');
      }

      return data;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: remindersKeys.detail(variables.reminder_id),
      });

      // Snapshot previous value
      const previousReminder = queryClient.getQueryData<Reminder>(
        remindersKeys.detail(variables.reminder_id)
      );

      return { previousReminder };
    },
    onSuccess: (data, variables) => {
      // Invalidate reminder queries to refetch updated data
      queryClient.invalidateQueries({
        queryKey: remindersKeys.detail(variables.reminder_id),
      });
      queryClient.invalidateQueries({ queryKey: remindersKeys.lists() });

      // Show success toast with details
      const costInfo = data.estimatedCost
        ? ` (Estimated cost: €${data.estimatedCost.toFixed(4)})`
        : '';
      const partsInfo = data.parts && data.parts > 1 ? ` in ${data.parts} parts` : '';

      toast({
        title: 'SMS Sent Successfully',
        description: `SMS notification sent via ${data.provider || 'provider'}${partsInfo}${costInfo}`,
        variant: 'default',
      });
    },
    onError: (error, variables, context) => {
      // Rollback if needed
      if (context?.previousReminder) {
        queryClient.setQueryData(
          remindersKeys.detail(variables.reminder_id),
          context.previousReminder
        );
      }

      // Handle rate limiting errors
      if (error.message.includes('rate limit')) {
        toast({
          title: 'Rate Limit Exceeded',
          description: 'Too many SMS requests. Please wait a moment and try again.',
          variant: 'destructive',
        });
        return;
      }

      // Handle insufficient credits
      if (error.message.includes('credits') || error.message.includes('balance')) {
        toast({
          title: 'Insufficient Credits',
          description: 'Please add credits to your account to send SMS notifications.',
          variant: 'destructive',
        });
        return;
      }

      // Handle invalid phone number
      if (error.message.includes('phone') || error.message.includes('number')) {
        toast({
          title: 'Invalid Phone Number',
          description: 'The phone number is invalid or missing. Please check and try again.',
          variant: 'destructive',
        });
        return;
      }

      // Generic error
      toast({
        title: 'Error Sending SMS',
        description: error.message || 'Failed to send SMS notification. Please try again.',
        variant: 'destructive',
      });
    },
    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry rate limit or validation errors
      if (
        error.message.includes('rate limit') ||
        error.message.includes('phone') ||
        error.message.includes('credits')
      ) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    ...options,
  });
}

/**
 * Hook for batch sending SMS to multiple reminders
 */
export function useSendBulkReminderSMS(
  options?: Omit<
    UseMutationOptions<
      SendSMSResponse[],
      Error,
      SendReminderSMSInput[],
      SendSMSContext
    >,
    'mutationFn'
  >
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<SendSMSResponse[], Error, SendReminderSMSInput[], SendSMSContext>({
    mutationFn: async (inputs) => {
      // Call the bulk SMS API endpoint
      const response = await fetch('/api/notifications/send-bulk-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reminders: inputs }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send bulk SMS');
      }

      const data = await response.json();
      return data.results || [];
    },
    onSuccess: (data) => {
      // Invalidate all reminder queries
      queryClient.invalidateQueries({ queryKey: remindersKeys.all });

      const successCount = data.filter((r) => r.success).length;
      const totalCount = data.length;
      const totalCost = data.reduce((sum, r) => sum + (r.estimatedCost || 0), 0);

      toast({
        title: 'Bulk SMS Sent',
        description: `${successCount}/${totalCount} SMS sent successfully. Total cost: €${totalCost.toFixed(4)}`,
        variant: successCount === totalCount ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Sending Bulk SMS',
        description: error.message || 'Failed to send bulk SMS. Please try again.',
        variant: 'destructive',
      });
    },
    ...options,
  });
}

/**
 * Hook for testing SMS sending (dry run)
 */
export function useTestReminderSMS(
  options?: Omit<
    UseMutationOptions<SendSMSResponse, Error, SendReminderSMSInput, SendSMSContext>,
    'mutationFn'
  >
) {
  const { toast } = useToast();

  return useMutation<SendSMSResponse, Error, SendReminderSMSInput, SendSMSContext>({
    mutationFn: async (input) => {
      // Call the test SMS API endpoint (dry run)
      const response = await fetch('/api/notifications/test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminder_id: input.reminder_id,
          phone_number: input.phone_number,
          message: input.message,
          template: input.template,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to test SMS');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'SMS Test Successful',
        description: `Message preview generated. ${data.parts || 1} part(s), estimated cost: €${(data.estimatedCost || 0).toFixed(4)}`,
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'SMS Test Failed',
        description: error.message || 'Failed to test SMS. Please check your configuration.',
        variant: 'destructive',
      });
    },
    ...options,
  });
}
