import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { Database } from '@/types';

type Reminder = Database['public']['Tables']['reminders']['Row'];

export interface RemindersFilters {
  status?: 'active' | 'expired' | 'opted_out' | 'deleted';
  type?: 'itp' | 'rca' | 'rovinieta';
  station_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  search?: string; // Search by plate number or name
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface RemindersResponse {
  data: Reminder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UseRemindersParams {
  filters?: RemindersFilters;
  pagination?: PaginationParams;
  enabled?: boolean;
}

const REMINDERS_QUERY_KEY = 'reminders';

/**
 * React Query hook for fetching reminders with filters and pagination
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useReminders({
 *   filters: { status: 'active', type: 'itp' },
 *   pagination: { page: 1, limit: 20 }
 * });
 * ```
 */
export function useReminders(
  params?: UseRemindersParams,
  options?: Omit<UseQueryOptions<RemindersResponse, Error>, 'queryKey' | 'queryFn'>
) {
  const { filters, pagination, enabled = true } = params || {};
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 20;

  return useQuery<RemindersResponse, Error>({
    queryKey: [REMINDERS_QUERY_KEY, filters, pagination],
    queryFn: async () => {
      const supabase = createBrowserClient();

      // Start building the query
      let query = supabase
        .from('reminders')
        .select('*', { count: 'exact' });

      // Apply status filters
      if (filters?.status) {
        const now = new Date().toISOString();

        switch (filters.status) {
          case 'active':
            query = query
              .gte('expiry_date', now)
              .eq('opt_out', false)
              .is('deleted_at', null);
            break;
          case 'expired':
            query = query
              .lt('expiry_date', now)
              .eq('opt_out', false)
              .is('deleted_at', null);
            break;
          case 'opted_out':
            query = query.eq('opt_out', true).is('deleted_at', null);
            break;
          case 'deleted':
            query = query.not('deleted_at', 'is', null);
            break;
        }
      } else {
        // Default: exclude deleted
        query = query.is('deleted_at', null);
      }

      // Apply type filter
      if (filters?.type) {
        query = query.eq('reminder_type', filters.type);
      }

      // Apply station filter
      if (filters?.station_id) {
        query = query.eq('station_id', filters.station_id);
      }

      // Apply date range filter
      if (filters?.date_range) {
        query = query
          .gte('expiry_date', filters.date_range.start)
          .lte('expiry_date', filters.date_range.end);
      }

      // Apply search filter (plate number or guest name)
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`plate_number.ilike.${searchTerm},guest_name.ilike.${searchTerm}`);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      // Order by created date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
}

/**
 * Hook for fetching a single reminder by ID
 */
export function useReminder(
  reminderId: string | null | undefined,
  options?: Omit<UseQueryOptions<Reminder, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Reminder, Error>({
    queryKey: [REMINDERS_QUERY_KEY, reminderId],
    queryFn: async () => {
      if (!reminderId) {
        throw new Error('Reminder ID is required');
      }

      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', reminderId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('Reminder not found');
      }

      return data;
    },
    enabled: !!reminderId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Export query key factory for manual cache management
 */
export const remindersKeys = {
  all: [REMINDERS_QUERY_KEY] as const,
  lists: () => [...remindersKeys.all, 'list'] as const,
  list: (filters?: RemindersFilters, pagination?: PaginationParams) =>
    [...remindersKeys.lists(), filters, pagination] as const,
  details: () => [...remindersKeys.all, 'detail'] as const,
  detail: (id: string) => [...remindersKeys.details(), id] as const,
};
