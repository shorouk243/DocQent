import { useRef, useCallback, useEffect } from 'react';

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const latestArgsRef = useRef<Parameters<T> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      latestArgsRef.current = args;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const args = latestArgsRef.current;
        if (args) {
          callbackRef.current(...args);
        }
      }, delay);
    },
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return debouncedFn;
}
