import { useRef, useCallback, useEffect } from 'react';

/**
 * Returns a debounced version of the callback that delays invoking it until
 * after `delay` ms have elapsed since the last call.
 *
 * @param callback - Function to debounce (can be async)
 * @param delay - Delay in milliseconds
 * @returns Debounced function with the same signature as the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const latestArgsRef = useRef<Parameters<T> | null>(null);

  // Keep callback ref up to date
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

  // Clear pending timeout on unmount
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
