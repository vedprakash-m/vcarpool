/**
 * Frontend Component Optimization Utilities
 * Higher-order components and utilities for performance optimization
 */

import React, { memo, lazy, ComponentType, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Performance-optimized lazy loading wrapper
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return memo((props: React.ComponentProps<T>) => (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  ));
}

/**
 * Performance monitoring HOC
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: ComponentType<P>,
  componentName?: string
) {
  const componentDisplayName =
    componentName || WrappedComponent.displayName || WrappedComponent.name;

  const PerformanceMonitoredComponent = memo((props: P) => {
    React.useEffect(() => {
      const startTime = performance.now();

      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        if (renderTime > 16) {
          // Frame budget is ~16ms
          console.warn(
            `Slow render detected in ${componentDisplayName}: ${renderTime.toFixed(2)}ms`
          );
        }
      };
    });

    return <WrappedComponent {...props} />;
  });

  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${componentDisplayName})`;
  return PerformanceMonitoredComponent;
}

/**
 * Memoized component with custom comparison
 */
export function createMemoizedComponent<P extends object>(
  Component: ComponentType<P>,
  compare?: (prevProps: P, nextProps: P) => boolean
) {
  return memo(Component, compare);
}

/**
 * Virtualized list component for performance
 */
interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Optimized image component with lazy loading
 */
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = memo(
  ({
    src,
    alt,
    width,
    height,
    className = '',
    placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+',
    onLoad,
    onError,
  }: OptimizedImageProps) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const imgRef = React.useRef<HTMLImageElement>(null);

    const handleLoad = React.useCallback(() => {
      setIsLoaded(true);
      onLoad?.();
    }, [onLoad]);

    const handleError = React.useCallback(() => {
      setHasError(true);
      onError?.();
    }, [onError]);

    React.useEffect(() => {
      const img = imgRef.current;
      if (!img) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            img.src = src;
            observer.unobserve(img);
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(img);

      return () => {
        observer.unobserve(img);
      };
    }, [src]);

    if (hasError) {
      return (
        <div
          className={`bg-gray-200 flex items-center justify-center ${className}`}
          style={{ width, height }}
        >
          <span className="text-gray-500 text-sm">Failed to load image</span>
        </div>
      );
    }

    return (
      <img
        ref={imgRef}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        src={placeholder}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

/**
 * Error boundary with performance recovery
 */
interface PerformanceErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    resetErrorBoundary: () => void;
  }>;
  onError?: (error: Error, errorInfo: any) => void;
}

export function PerformanceErrorBoundary({
  children,
  fallback: Fallback,
  onError,
}: PerformanceErrorBoundaryProps) {
  const DefaultFallback = ({
    error,
    resetErrorBoundary,
  }: {
    error: Error;
    resetErrorBoundary: () => void;
  }) => (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <h2 className="text-red-800 font-semibold mb-2">Something went wrong</h2>
      <p className="text-red-600 text-sm mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );

  return (
    <ErrorBoundary
      FallbackComponent={Fallback || DefaultFallback}
      onError={onError}
      onReset={() => {
        // Clear any performance-related state
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Batch state updates for performance
 */
export function useBatchedUpdates() {
  const [updates, setUpdates] = React.useState<Array<() => void>>([]);

  const batchUpdate = React.useCallback((updateFn: () => void) => {
    setUpdates(prev => [...prev, updateFn]);
  }, []);

  React.useEffect(() => {
    if (updates.length > 0) {
      const timeoutId = setTimeout(() => {
        // Use setTimeout to batch updates in the next tick
        updates.forEach(update => update());
        setUpdates([]);
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [updates]);

  return batchUpdate;
}

/**
 * Optimized form component with debounced validation
 */
interface OptimizedFormProps {
  children: React.ReactNode;
  onSubmit: (data: any) => void;
  validation?: (data: any) => Record<string, string>;
  debounceMs?: number;
}

export function OptimizedForm({
  children,
  onSubmit,
  validation,
  debounceMs = 300,
}: OptimizedFormProps) {
  const [values, setValues] = React.useState<Record<string, any>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const validationTimeoutRef = React.useRef<NodeJS.Timeout>();

  const handleValueChange = React.useCallback(
    (name: string, value: any) => {
      setValues(prev => ({ ...prev, [name]: value }));

      if (validation) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = setTimeout(() => {
          const newErrors = validation({ ...values, [name]: value });
          setErrors(newErrors);
        }, debounceMs);
      }
    },
    [values, validation, debounceMs]
  );

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (validation) {
        const validationErrors = validation(values);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      onSubmit(values);
    },
    [values, validation, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.props.name) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value: values[child.props.name] || '',
            onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
              handleValueChange(child.props.name, e.target.value),
            error: errors[child.props.name],
          });
        }
        return child;
      })}
    </form>
  );
}
