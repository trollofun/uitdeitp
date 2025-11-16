import { useState, useCallback } from 'react';
import type { ApiResponse } from '@/lib/api/responses';

interface UseApiOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
}

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  fetchData: (url: string, options?: RequestInit) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for API calls with consistent error handling
 * Automatically handles the standard { success: true, data: T } response structure
 *
 * @example
 * ```typescript
 * const { data, loading, error, fetchData } = useApi<UserProfile>();
 *
 * useEffect(() => {
 *   fetchData('/api/profile');
 * }, []);
 *
 * if (loading) return <Loader />;
 * if (error) return <Error message={error} />;
 * if (data) return <Profile data={data} />;
 * ```
 */
export function useApi<T>(options?: UseApiOptions): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(
    async (url: string, fetchOptions?: RequestInit) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, fetchOptions);
        const json: ApiResponse<T> = await response.json();

        if (json.success) {
          setData(json.data);
          options?.onSuccess?.(json.data);
        } else {
          const errorMessage = json.error || 'A apărut o eroare';
          setError(errorMessage);
          options?.onError?.(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Eroare de conexiune';
        setError(errorMessage);
        options?.onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    error,
    loading,
    fetchData,
    reset,
  };
}

/**
 * Hook variant for mutations (POST, PATCH, DELETE)
 * Similar to useApi but designed for write operations
 *
 * @example
 * ```typescript
 * const { mutate, loading, error } = useMutation<Reminder>();
 *
 * const handleSubmit = async () => {
 *   await mutate('/api/reminders', {
 *     method: 'POST',
 *     body: JSON.stringify({ plate: 'B-123-ABC' })
 *   });
 * };
 * ```
 */
export function useMutation<T>(options?: UseApiOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const mutate = useCallback(
    async (url: string, fetchOptions?: RequestInit): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions?.headers,
          },
        });

        const json: ApiResponse<T> = await response.json();

        if (json.success) {
          setData(json.data);
          options?.onSuccess?.(json.data);
          return json.data;
        } else {
          const errorMessage = json.error || 'A apărut o eroare';
          setError(errorMessage);
          options?.onError?.(errorMessage);
          return null;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Eroare de conexiune';
        setError(errorMessage);
        options?.onError?.(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    data,
    loading,
    error,
    reset,
  };
}
