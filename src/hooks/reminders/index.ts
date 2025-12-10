/**
 * Reminders React Query Hooks
 *
 * Comprehensive hooks for managing reminders with React Query
 *
 * Features:
 * - Type-safe with TypeScript
 * - Optimistic updates
 * - Automatic cache management
 * - Error handling with rollback
 * - Toast notifications
 * - Rate limiting awareness
 * - Batch operations support
 */

// Query hooks
export {
  useReminders,
  useReminder,
  remindersKeys,
  type RemindersFilters,
  type PaginationParams,
  type RemindersResponse,
  type UseRemindersParams,
} from './useReminders';

// Mutation hooks - Create
export {
  useCreateReminder,
  useCreateReminders,
  type CreateReminderInput,
} from './useCreateReminder';

// Mutation hooks - Update
export {
  useUpdateReminder,
  useToggleReminderOptOut,
  useUpdateNotificationSettings,
  type UpdateReminderInput,
} from './useUpdateReminder';

// Mutation hooks - Delete
export {
  useDeleteReminder,
  useRestoreReminder,
  useDeleteReminders,
  type DeleteReminderInput,
} from './useDeleteReminder';

// Mutation hooks - SMS
export {
  useSendReminderSMS,
  useSendBulkReminderSMS,
  useTestReminderSMS,
  type SendReminderSMSInput,
  type SendSMSResponse,
} from './useSendReminderSMS';
