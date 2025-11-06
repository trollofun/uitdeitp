import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRealtimeReminders, optimisticUpdateReminder } from '@/hooks/reminders/useRealtimeReminders'
import type { Database } from '@/types'

type ReminderRow = Database['public']['Tables']['reminders']['Row']

// Mock Supabase client
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn((callback) => {
    callback('SUBSCRIBED')
    return mockChannel
  }),
  unsubscribe: vi.fn(),
}

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => mockSupabase,
}))

describe('useRealtimeReminders', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should create a subscription on mount', () => {
    renderHook(() => useRealtimeReminders(), { wrapper })

    expect(mockSupabase.channel).toHaveBeenCalledWith(expect.stringContaining('reminders-changes'))
    expect(mockChannel.on).toHaveBeenCalledTimes(3) // INSERT, UPDATE, DELETE
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('should not create subscription when disabled', () => {
    renderHook(() => useRealtimeReminders({ enabled: false }), { wrapper })

    expect(mockSupabase.channel).not.toHaveBeenCalled()
  })

  it('should cleanup subscription on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeReminders(), { wrapper })

    unmount()

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('should call onInsert callback', async () => {
    const onInsert = vi.fn()
    const mockPayload = {
      eventType: 'INSERT',
      new: {
        id: '123',
        plate_number: 'B123ABC',
        reminder_type: 'itp',
        expiry_date: '2024-12-31',
      } as ReminderRow,
      old: null,
      schema: 'public',
      table: 'reminders',
      commit_timestamp: '2024-01-01T00:00:00Z',
    }

    renderHook(() => useRealtimeReminders({ onInsert }), { wrapper })

    // Get the INSERT handler that was registered
    const insertHandler = mockChannel.on.mock.calls.find(
      (call) => call[1].event === 'INSERT'
    )?.[2]

    // Simulate INSERT event
    insertHandler?.(mockPayload)

    await waitFor(() => {
      expect(onInsert).toHaveBeenCalledWith(mockPayload)
    })
  })

  it('should call onUpdate callback', async () => {
    const onUpdate = vi.fn()
    const mockPayload = {
      eventType: 'UPDATE',
      new: {
        id: '123',
        plate_number: 'B123ABC',
        opt_out: true,
      } as ReminderRow,
      old: {
        id: '123',
        plate_number: 'B123ABC',
        opt_out: false,
      } as ReminderRow,
      schema: 'public',
      table: 'reminders',
      commit_timestamp: '2024-01-01T00:00:00Z',
    }

    renderHook(() => useRealtimeReminders({ onUpdate }), { wrapper })

    const updateHandler = mockChannel.on.mock.calls.find(
      (call) => call[1].event === 'UPDATE'
    )?.[2]

    updateHandler?.(mockPayload)

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(mockPayload)
    })
  })

  it('should call onDelete callback', async () => {
    const onDelete = vi.fn()
    const mockPayload = {
      eventType: 'DELETE',
      new: null,
      old: {
        id: '123',
        plate_number: 'B123ABC',
      } as ReminderRow,
      schema: 'public',
      table: 'reminders',
      commit_timestamp: '2024-01-01T00:00:00Z',
    }

    renderHook(() => useRealtimeReminders({ onDelete }), { wrapper })

    const deleteHandler = mockChannel.on.mock.calls.find(
      (call) => call[1].event === 'DELETE'
    )?.[2]

    deleteHandler?.(mockPayload)

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(mockPayload)
    })
  })

  it('should call onChange callback for all events', async () => {
    const onChange = vi.fn()

    renderHook(() => useRealtimeReminders({ onChange }), { wrapper })

    // Test INSERT
    const insertHandler = mockChannel.on.mock.calls.find(
      (call) => call[1].event === 'INSERT'
    )?.[2]
    insertHandler?.({
      eventType: 'INSERT',
      new: { id: '1', plate_number: 'B111AAA' } as ReminderRow,
    })

    // Test UPDATE
    const updateHandler = mockChannel.on.mock.calls.find(
      (call) => call[1].event === 'UPDATE'
    )?.[2]
    updateHandler?.({
      eventType: 'UPDATE',
      new: { id: '1', plate_number: 'B111AAA' } as ReminderRow,
    })

    // Test DELETE
    const deleteHandler = mockChannel.on.mock.calls.find(
      (call) => call[1].event === 'DELETE'
    )?.[2]
    deleteHandler?.({
      eventType: 'DELETE',
      old: { id: '1', plate_number: 'B111AAA' } as ReminderRow,
    })

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(3)
    })
  })

  it('should invalidate queries on change', async () => {
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')

    renderHook(() => useRealtimeReminders({ queryKey: ['reminders'] }), { wrapper })

    const insertHandler = mockChannel.on.mock.calls.find(
      (call) => call[1].event === 'INSERT'
    )?.[2]

    insertHandler?.({
      eventType: 'INSERT',
      new: { id: '1', plate_number: 'B111AAA' } as ReminderRow,
    })

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reminders'] })
    })
  })

  it('should apply userId filter', () => {
    const userId = 'user123'

    renderHook(() => useRealtimeReminders({ userId }), { wrapper })

    const onCall = mockChannel.on.mock.calls[0]
    expect(onCall[1].filter).toContain(`user_id=eq.${userId}`)
  })

  it('should apply stationId filter', () => {
    const stationId = 'station456'

    renderHook(() => useRealtimeReminders({ stationId }), { wrapper })

    const onCall = mockChannel.on.mock.calls[0]
    expect(onCall[1].filter).toContain(`station_id=eq.${stationId}`)
  })

  it('should apply combined filters', () => {
    const userId = 'user123'
    const stationId = 'station456'

    renderHook(() => useRealtimeReminders({ userId, stationId }), { wrapper })

    const onCall = mockChannel.on.mock.calls[0]
    expect(onCall[1].filter).toContain(`user_id=eq.${userId}`)
    expect(onCall[1].filter).toContain(`station_id=eq.${stationId}`)
  })

  it('should handle subscription errors', async () => {
    const onError = vi.fn()
    const mockErrorChannel = {
      ...mockChannel,
      subscribe: vi.fn((callback) => {
        callback('CHANNEL_ERROR', { message: 'Connection failed' })
        return mockErrorChannel
      }),
    }

    mockSupabase.channel = vi.fn(() => mockErrorChannel)

    renderHook(() => useRealtimeReminders({ onError }), { wrapper })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  it('should handle subscription timeout', async () => {
    const onError = vi.fn()
    const mockTimeoutChannel = {
      ...mockChannel,
      subscribe: vi.fn((callback) => {
        callback('TIMED_OUT')
        return mockTimeoutChannel
      }),
    }

    mockSupabase.channel = vi.fn(() => mockTimeoutChannel)

    renderHook(() => useRealtimeReminders({ onError }), { wrapper })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toContain('timed out')
    })
  })

  it('should return subscription status', () => {
    const { result } = renderHook(() => useRealtimeReminders(), { wrapper })

    // Initially, isSubscribed should be defined (starts as false)
    expect(result.current.isSubscribed).toBeDefined()
    expect(typeof result.current.isSubscribed).toBe('boolean')
  })
})

describe('optimisticUpdateReminder', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
  })

  it('should optimistically update reminder in cache', () => {
    const mockReminders: ReminderRow[] = [
      {
        id: '1',
        plate_number: 'B111AAA',
        opt_out: false,
      } as ReminderRow,
      {
        id: '2',
        plate_number: 'B222BBB',
        opt_out: false,
      } as ReminderRow,
    ]

    queryClient.setQueryData(['reminders'], mockReminders)

    const context = optimisticUpdateReminder(queryClient, {
      id: '1',
      opt_out: true,
    })

    const updatedData = queryClient.getQueryData<ReminderRow[]>(['reminders'])

    expect(updatedData?.[0].opt_out).toBe(true)
    expect(updatedData?.[1].opt_out).toBe(false)
    expect(context.previousReminders).toEqual(mockReminders)
  })

  it('should not update if reminder not found', () => {
    const mockReminders: ReminderRow[] = [
      {
        id: '1',
        plate_number: 'B111AAA',
        opt_out: false,
      } as ReminderRow,
    ]

    queryClient.setQueryData(['reminders'], mockReminders)

    optimisticUpdateReminder(queryClient, {
      id: '999',
      opt_out: true,
    })

    const data = queryClient.getQueryData<ReminderRow[]>(['reminders'])
    expect(data).toEqual(mockReminders) // Unchanged
  })

  it('should use custom query key', () => {
    const customKey = ['custom', 'reminders', 'key']
    const mockReminders: ReminderRow[] = [
      {
        id: '1',
        plate_number: 'B111AAA',
        opt_out: false,
      } as ReminderRow,
    ]

    queryClient.setQueryData(customKey, mockReminders)

    optimisticUpdateReminder(
      queryClient,
      {
        id: '1',
        opt_out: true,
      },
      customKey
    )

    const data = queryClient.getQueryData<ReminderRow[]>(customKey)
    expect(data?.[0].opt_out).toBe(true)
  })

  it('should return previous data for rollback', () => {
    const mockReminders: ReminderRow[] = [
      {
        id: '1',
        user_id: 'user-1',
        guest_phone: null,
        guest_name: null,
        plate_number: 'B111AAA',
        reminder_type: 'itp',
        expiry_date: '2024-12-31',
        notification_intervals: [],
        notification_channels: [],
        last_notification_sent_at: null,
        next_notification_date: null,
        source: 'web',
        station_id: null,
        consent_given: true,
        consent_timestamp: '2024-01-01T00:00:00Z',
        consent_ip: '127.0.0.1',
        opt_out: false,
        opt_out_timestamp: null,
        deleted_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]

    queryClient.setQueryData(['reminders'], mockReminders)

    const context = optimisticUpdateReminder(queryClient, {
      id: '1',
      opt_out: true,
    })

    expect(context.previousReminders).toEqual(mockReminders)
  })
})
