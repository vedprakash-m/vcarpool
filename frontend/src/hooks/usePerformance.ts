/**
 * Frontend Performance Optimization Hooks
 * Custom hooks for performance monitoring and optimization
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    renderTime: number;
    loadTime: number;
    interactionTime: number;
  }>({
    renderTime: 0,
    loadTime: 0,
    interactionTime: 0,
  });

  const startTime = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endTimer = useCallback((type: 'render' | 'load' | 'interaction') => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;

    setMetrics(prev => ({
      ...prev,
      [`${type}Time`]: duration,
    }));

    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow ${type} operation: ${duration.toFixed(2)}ms`);
    }
  }, []);

  return { metrics, startTimer, endTimer };
}

/**
 * Hook for debouncing values to improve performance
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        return func(...args);
      } else {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(
          () => {
            lastCall.current = Date.now();
            func(...args);
          },
          delay - (now - lastCall.current)
        );
      }
    }) as T,
    [func, delay]
  );
}

/**
 * Hook for lazy loading with intersection observer
 */
export function useLazyLoad(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.unobserve(element);
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, hasLoaded]);

  return { elementRef, isVisible, hasLoaded };
}

/**
 * Hook for managing component state with local storage caching
 */
export function useCachedState<T>(
  key: string,
  initialValue: T,
  ttl: number = 5 * 60 * 1000 // 5 minutes default
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { value, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return value;
        }
      }
    } catch (error) {
      console.warn('Failed to load cached state:', error);
    }
    return initialValue;
  });

  const setCachedState = useCallback(
    (value: T) => {
      setState(value);
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            value,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.warn('Failed to cache state:', error);
      }
    },
    [key]
  );

  return [state, setCachedState];
}

/**
 * Hook for virtual scrolling performance optimization
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16); // 60fps

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleStart,
    visibleEnd,
  };
}

/**
 * Hook for managing async operations with loading states
 */
export function useAsyncOperation<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (operation: () => Promise<T>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await operation();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Operation failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}
