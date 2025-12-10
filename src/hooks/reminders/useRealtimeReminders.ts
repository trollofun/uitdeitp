'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/client'
import { Database } from '@/types'

type ReminderRow = Database['public']['Tables']['reminders']['Row']
type RealtimePayload = RealtimePostgresChangesPayload<ReminderRow>

export interface UseRealtimeRemindersOptions {
  /**
   * Enable realtime subscriptions
   * @default true
   */
  enabled?: boolean

  /**
   * Query key to invalidate on changes
   * @default ['reminders']
   */
  queryKey?: string[]

  /**
   * Callback on INSERT event
   */
  onInsert?: (payload: RealtimePayload) => void

  /**
   * Callback on UPDATE event
   */
  onUpdate?: (payload: RealtimePayload) => void

  /**
   * Callback on DELETE event
   */
  onDelete?: (payload: RealtimePayload) => void

  /**
   * Callback on any change event
   */
  onChange?: (payload: RealtimePayload) => void

  /**
   * Callback on subscription error
   */
  onError?: (error: Error) => void

  /**
   * Filter changes by user_id (optional)
   */
  userId?: string | null

  /**
   * Filter changes by station_id (optional)
   */
  stationId?: string | null
}

/**
 * Hook to subscribe to real-time changes on the reminders table
 *
 * @example
 * ```tsx
 * // Basic usage
 * useRealtimeReminders()
 *
 * // With callbacks
 * useRealtimeReminders({
 *   onInsert: (payload) => {
 *     console.log('New reminder:', payload.new)
 *   },
 *   onUpdate: (payload) => {
 *     console.log('Updated reminder:', payload.new)
 *   }
 * })
 *
 * // With user filtering
 * const { data: session } = useSession()
 * useRealtimeReminders({
 *   userId: session?.user?.id,
 *   queryKey: ['reminders', session?.user?.id]
 * })
 * ```
 */
export function useRealtimeReminders(options: UseRealtimeRemindersOptions = {}) {
  const {
    enabled = true,
    queryKey = ['reminders'],
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    onError,
    userId,
    stationId,
  } = options

  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isSubscribedRef = useRef(false)

  // Memoize callbacks to prevent unnecessary re-subscriptions
  const handleInsert = useCallback((payload: RealtimePayload) => {
    try {
      if (onInsert) onInsert(payload)
      if (onChange) onChange(payload)

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey })
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error in INSERT handler'))
      }
    }
  }, [onInsert, onChange, onError, queryClient, queryKey])

  const handleUpdate = useCallback((payload: RealtimePayload) => {
    try {
      if (onUpdate) onUpdate(payload)
      if (onChange) onChange(payload)

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey })
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error in UPDATE handler'))
      }
    }
  }, [onUpdate, onChange, onError, queryClient, queryKey])

  const handleDelete = useCallback((payload: RealtimePayload) => {
    try {
      if (onDelete) onDelete(payload)
      if (onChange) onChange(payload)

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey })
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error in DELETE handler'))
      }
    }
  }, [onDelete, onChange, onError, queryClient, queryKey])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const supabase = createBrowserClient()

    // Build filter string for RLS-compliant filtering
    let filter = ''
    const filters: string[] = []

    if (userId) {
      filters.push(`user_id=eq.${userId}`)
    }

    if (stationId) {
      filters.push(`station_id=eq.${stationId}`)
    }

    if (filters.length > 0) {
      filter = filters.join(',')
    }

    try {
      // Create unique channel name
      const channelName = `reminders-changes-${Date.now()}`

      const channel = supabase
        .channel(channelName)
        .on<ReminderRow>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'reminders',
            filter: filter || undefined,
          },
          handleInsert
        )
        .on<ReminderRow>(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'reminders',
            filter: filter || undefined,
          },
          handleUpdate
        )
        .on<ReminderRow>(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'reminders',
            filter: filter || undefined,
          },
          handleDelete
        )
        .subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            isSubscribedRef.current = true
          } else if (status === 'CHANNEL_ERROR' && error && onError) {
            onError(new Error(`Subscription error: ${error.message || 'Unknown error'}`))
          } else if (status === 'TIMED_OUT' && onError) {
            onError(new Error('Subscription timed out'))
          }
        })

      channelRef.current = channel

    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to create subscription'))
      }
    }

    // Cleanup function
    return () => {
      if (channelRef.current && isSubscribedRef.current) {
        const supabase = createBrowserClient()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        isSubscribedRef.current = false
      }
    }
  }, [enabled, userId, stationId, handleInsert, handleUpdate, handleDelete, onError])

  return {
    isSubscribed: isSubscribedRef.current,
  }
}

/**
 * Optimistic update helper for reminders
 * Use this to update the cache before the server responds
 *
 * @example
 * ```tsx
 * const { mutate } = useMutation({
 *   mutationFn: updateReminder,
 *   onMutate: async (variables) => {
 *     return optimisticUpdateReminder(queryClient, variables)
 *   },
 *   onError: (err, variables, context) => {
 *     if (context?.previousReminders) {
 *       queryClient.setQueryData(['reminders'], context.previousReminders)
 *     }
 *   }
 * })
 * ```
 */
export function optimisticUpdateReminder(
  queryClient: ReturnType<typeof useQueryClient>,
  updatedReminder: Partial<ReminderRow> & { id: string },
  queryKey: string[] = ['reminders']
) {
  // Cancel outgoing refetches
  queryClient.cancelQueries({ queryKey })

  // Snapshot previous value
  const previousReminders = queryClient.getQueryData<ReminderRow[]>(queryKey)

  // Optimistically update cache
  if (previousReminders) {
    queryClient.setQueryData<ReminderRow[]>(
      queryKey,
      previousReminders.map((reminder) =>
        reminder.id === updatedReminder.id
          ? { ...reminder, ...updatedReminder }
          : reminder
      )
    )
  }

  // Return context with previous value
  return { previousReminders }
}
