/**
 * Performance optimization hooks for Carpool application
 * Provides utilities for render tracking, debouncing, throttling, and memory management
 */

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';

/**
 * Performance timing interface for render performance tracking
 */
interface PerformanceMetrics {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  mountTime: number;
}

/**
 * Global performance store for tracking render metrics
 */
class PerformanceTracker {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private isDevelopment = process.env.NODE_ENV === 'development';

  track(componentName: string, renderTime: number) {
    if (!this.isDevelopment) return;

    const existing = this.metrics.get(componentName);
    if (existing) {
      const newCount = existing.renderCount + 1;
      const newAverage =
        (existing.averageRenderTime * existing.renderCount + renderTime) /
        newCount;

      this.metrics.set(componentName, {
        ...existing,
        renderCount: newCount,
        averageRenderTime: newAverage,
        lastRenderTime: renderTime,
      });
    } else {
      this.metrics.set(componentName, {
        componentName,
        renderCount: 1,
        averageRenderTime: renderTime,
        lastRenderTime: renderTime,
        mountTime: Date.now(),
      });
    }

    // Log performance warnings in development
    const current = this.metrics.get(componentName)!;
    if (current.renderCount > 1 && renderTime > 100) {
      console.warn(
        `⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(
          2
        )}ms`
      );
    }
  }

  getMetrics(
    componentName?: string
  ): PerformanceMetrics | PerformanceMetrics[] {
    if (componentName) {
      return (
        this.metrics.get(componentName) || {
          componentName,
          renderCount: 0,
          averageRenderTime: 0,
          lastRenderTime: 0,
          mountTime: Date.now(),
        }
      );
    }
    return Array.from(this.metrics.values());
  }

  clear() {
    this.metrics.clear();
  }
}

const performanceTracker = new PerformanceTracker();

/**
 * Hook to track render performance of React components
 * Automatically logs slow renders in development mode
 *
 * @param componentName - Name of the component for tracking
 * @param options - Configuration options
 */
export function useRenderPerformance(
  componentName: string,
  options: {
    logSlowRenders?: boolean;
    slowRenderThreshold?: number;
  } = {}
) {
  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);

  const {
    logSlowRenders = true,
    slowRenderThreshold = 16, // 60fps = 16.67ms per frame
  } = options;

  // Track render start
  renderStartTime.current = performance.now();
  renderCount.current += 1;

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;

    // Track the render performance
    performanceTracker.track(componentName, renderTime);

    // Log in development mode
    if (
      process.env.NODE_ENV === 'development' &&
      logSlowRenders &&
      renderTime > slowRenderThreshold
    ) {
      console.log(
        `🐌 ${componentName} render took ${renderTime.toFixed(2)}ms (render #${
          renderCount.current
        })`
      );
    }
  });

  // Return performance metrics for the component
  return useMemo(
    () => ({
      getMetrics: () =>
        performanceTracker.getMetrics(componentName) as PerformanceMetrics,
      getAllMetrics: () =>
        performanceTracker.getMetrics() as PerformanceMetrics[],
      renderCount: renderCount.current,
      componentAge: Date.now() - mountTime.current,
    }),
    [componentName]
  );
}

/**
 * Throttle hook to limit function calls to once per specified interval
 * Useful for scroll handlers, resize handlers, etc.
 *
 * @param callback - Function to throttle
 * @param delay - Minimum interval between calls in milliseconds
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        return callback(...args);
      } else {
        // Clear existing timeout and set a new one
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(
          () => {
            lastCall.current = Date.now();
            callback(...args);
          },
          delay - (now - lastCall.current)
        );
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Debounce hook to delay function execution until after specified delay
 * Useful for search inputs, API calls triggered by user input
 *
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

/**
 * Hook for debouncing values (useful for search inputs)
 *
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

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
 * Hook to optimize expensive calculations with memoization
 * Tracks cache hits/misses for performance monitoring
 *
 * @param factory - Function that computes the expensive value
 * @param deps - Dependencies array (similar to useMemo)
 * @param cacheKey - Optional cache key for tracking
 */
export function useExpensiveCalculation<T>(
  factory: () => T,
  deps: React.DependencyList,
  cacheKey?: string
): T {
  const cacheHits = useRef<number>(0);
  const cacheMisses = useRef<number>(0);
  const lastResult = useRef<T>();
  const lastDeps = useRef<React.DependencyList>();

  const result = useMemo(() => {
    cacheMisses.current += 1;
    const value = factory();
    lastResult.current = value;
    lastDeps.current = deps;

    if (process.env.NODE_ENV === 'development' && cacheKey) {
      console.log(
        `💰 Cache miss for ${cacheKey}. Total: ${cacheHits.current} hits, ${cacheMisses.current} misses`
      );
    }

    return value;
  }, deps);

  // Track cache effectiveness
  useEffect(() => {
    if (lastResult.current !== undefined) {
      cacheHits.current += 1;
    }
  });

  return result;
}

/**
 * Hook to prevent memory leaks by tracking component mount state
 * Useful for async operations that might complete after component unmounts
 */
export function useMountedRef() {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

/**
 * Hook for lazy loading heavy components or data
 *
 * @param loader - Async function that loads the resource
 * @param shouldLoad - Boolean indicating when to start loading
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  shouldLoad: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useMountedRef();

  useEffect(() => {
    if (!shouldLoad || data !== null) return;

    setLoading(true);
    setError(null);

    loader()
      .then(result => {
        if (isMounted.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted.current) {
          setError(err);
          setLoading(false);
        }
      });
  }, [shouldLoad, loader, data, isMounted]);

  return { data, loading, error };
}

/**
 * Hook to track and optimize re-renders
 * Logs which props/state changes caused re-renders
 *
 * @param name - Component name for logging
 * @param props - Props object to track
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  const previous = useRef<Record<string, any>>();

  useEffect(() => {
    if (previous.current && process.env.NODE_ENV === 'development') {
      const allKeys = Object.keys({ ...previous.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach(key => {
        if (previous.current![key] !== props[key]) {
          changedProps[key] = {
            from: previous.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length) {
        console.log('🔄 [why-did-you-update]', name, changedProps);
      }
    }

    previous.current = props;
  });
}

/**
 * Export performance tracker for advanced usage
 */
export { performanceTracker };

/**
 * Hook to get overall application performance metrics
 */
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);

  const refreshMetrics = useCallback(() => {
    setMetrics(performanceTracker.getMetrics() as PerformanceMetrics[]);
  }, []);

  const clearMetrics = useCallback(() => {
    performanceTracker.clear();
    setMetrics([]);
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  return {
    metrics,
    refreshMetrics,
    clearMetrics,
    totalComponents: metrics.length,
    slowestComponent: metrics.reduce(
      (slowest, current) =>
        current.averageRenderTime > (slowest?.averageRenderTime || 0)
          ? current
          : slowest,
      undefined as PerformanceMetrics | undefined
    ),
  };
}
