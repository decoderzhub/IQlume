import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api-client';

interface UseAPIOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  refetchInterval?: number;
  cacheTime?: number;
}

interface UseAPIResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  mutate: (data: T) => void;
}

export function useAPI<T>(
  endpoint: string | null,
  options: UseAPIOptions<T> = {}
): UseAPIResult<T> {
  const {
    onSuccess,
    onError,
    enabled = true,
    refetchInterval,
    cacheTime = 300000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const mountedRef = useRef(true);
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!endpoint || !enabled) return;

    const now = Date.now();
    if (cacheRef.current && now - cacheRef.current.timestamp < cacheTime) {
      setData(cacheRef.current.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.get<T>(endpoint);

      if (mountedRef.current) {
        setData(result);
        cacheRef.current = { data: result, timestamp: now };
        setError(null);
        onSuccess?.(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Enhanced error logging with user-friendly messages
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          console.error(`[useAPI] ❌ UNAUTHORIZED: No Alpaca account connected or token expired for endpoint: ${endpoint}`);
          console.error('[useAPI] 💡 Solution: Go to Accounts page and connect your Alpaca account');
        } else {
          console.error(`[useAPI] Error fetching ${endpoint}:`, error.message);
        }

        setError(error);
        onError?.(error);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [endpoint, enabled, cacheTime, onSuccess, onError]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
    cacheRef.current = { data: newData, timestamp: Date.now() };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(fetchData, refetchInterval);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, refetchInterval, enabled]);

  return {
    data,
    error,
    isLoading,
    refetch: fetchData,
    mutate,
  };
}

interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>;
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
}

export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const { onSuccess, onError } = options;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);

        if (mountedRef.current) {
          setData(result);
          setError(null);
          onSuccess?.(result, variables);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (mountedRef.current) {
          setError(error);
          onError?.(error, variables);
        }

        return null;
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [mutationFn, onSuccess, onError]
  );

  return {
    mutate,
    data,
    error,
    isLoading,
  };
}
