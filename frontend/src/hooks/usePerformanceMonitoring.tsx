/**
 * Performance Monitoring Hook
 * Phase 1: Foundation Strengthening - Frontend Performance
 *
 * Provides comprehensive performance monitoring for React components:
 * - Core Web Vitals tracking
 * - Component render performance
 * - Memory usage monitoring
 * - Network performance tracking
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;

  // Component Performance
  componentRenderTime?: number;
  componentMountTime?: number;
  reRenderCount?: number;

  // Memory
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };

  // Network
  navigationTiming?: PerformanceNavigationTiming;
  resourceTiming?: PerformanceResourceTiming[];

  // Custom Metrics
  customMetrics?: Record<string, number>;
}

interface PerformanceConfig {
  trackWebVitals: boolean;
  trackComponentPerformance: boolean;
  trackMemory: boolean;
  trackNetwork: boolean;
  sampleRate: number; // 0-1, percentage of sessions to track
  reportingEndpoint?: string;
  alertThresholds: {
    lcp: number; // Largest Contentful Paint threshold (ms)
    fid: number; // First Input Delay threshold (ms)
    cls: number; // Cumulative Layout Shift threshold
    componentRender: number; // Component render time threshold (ms)
  };
}

const defaultConfig: PerformanceConfig = {
  trackWebVitals: true,
  trackComponentPerformance: true,
  trackMemory: true,
  trackNetwork: true,
  sampleRate: 0.1, // 10% sampling
  alertThresholds: {
    lcp: 2500, // 2.5 seconds
    fid: 100, // 100ms
    cls: 0.1, // 0.1 CLS units
    componentRender: 16, // 16ms for 60fps
  },
};

export function usePerformanceMonitoring(
  componentName: string,
  config: Partial<PerformanceConfig> = {}
) {
  const fullConfig = { ...defaultConfig, ...config };
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isTracking, setIsTracking] = useState(false);

  const mountTimeRef = useRef<number>();
  const renderCountRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>();
  const observersRef = useRef<{
    lcp?: PerformanceObserver;
    fid?: PerformanceObserver;
    cls?: PerformanceObserver;
  }>({});

  // Determine if this session should be tracked based on sample rate
  const shouldTrack = useRef<boolean>(
    Math.random() < fullConfig.sampleRate
  ).current;

  /**
   * Initialize performance tracking
   */
  useEffect(() => {
    if (!shouldTrack) return;

    mountTimeRef.current = performance.now();
    setIsTracking(true);

    if (fullConfig.trackWebVitals) {
      initializeWebVitalsTracking();
    }

    if (fullConfig.trackMemory) {
      trackMemoryUsage();
    }

    if (fullConfig.trackNetwork) {
      trackNetworkPerformance();
    }

    return () => {
      cleanup();
    };
  }, [shouldTrack, fullConfig]);

  /**
   * Track component render performance
   */
  useEffect(() => {
    if (!shouldTrack || !fullConfig.trackComponentPerformance) return;

    const renderStart = performance.now();
    renderCountRef.current += 1;

    // Measure render time after DOM update
    const rafId = requestAnimationFrame(() => {
      const renderTime = performance.now() - renderStart;
      lastRenderTimeRef.current = renderTime;

      setMetrics(prev => ({
        ...prev,
        componentRenderTime: renderTime,
        reRenderCount: renderCountRef.current,
        componentMountTime: mountTimeRef.current
          ? renderStart - mountTimeRef.current
          : undefined,
      }));

      // Alert on slow renders
      if (renderTime > fullConfig.alertThresholds.componentRender) {
        reportPerformanceIssue('slow_render', {
          componentName,
          renderTime,
          threshold: fullConfig.alertThresholds.componentRender,
        });
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  });

  /**
   * Initialize Web Vitals tracking
   */
  const initializeWebVitalsTracking = useCallback(() => {
    // Track Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      observersRef.current.lcp = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        if (lastEntry) {
          const lcp = lastEntry.startTime;
          setMetrics(prev => ({ ...prev, largestContentfulPaint: lcp }));

          if (lcp > fullConfig.alertThresholds.lcp) {
            reportPerformanceIssue('slow_lcp', {
              componentName,
              lcp,
              threshold: fullConfig.alertThresholds.lcp,
            });
          }
        }
      });

      try {
        observersRef.current.lcp.observe({
          entryTypes: ['largest-contentful-paint'],
        });
      } catch (e) {
        console.warn('LCP observer not supported');
      }
    }

    // Track First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      observersRef.current.fid = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          setMetrics(prev => ({ ...prev, firstInputDelay: fid }));

          if (fid > fullConfig.alertThresholds.fid) {
            reportPerformanceIssue('slow_fid', {
              componentName,
              fid,
              threshold: fullConfig.alertThresholds.fid,
            });
          }
        });
      });

      try {
        observersRef.current.fid.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID observer not supported');
      }
    }

    // Track Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      let clsValue = 0;

      observersRef.current.cls = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            setMetrics(prev => ({
              ...prev,
              cumulativeLayoutShift: clsValue,
            }));

            if (clsValue > fullConfig.alertThresholds.cls) {
              reportPerformanceIssue('high_cls', {
                componentName,
                cls: clsValue,
                threshold: fullConfig.alertThresholds.cls,
              });
            }
          }
        });
      });

      try {
        observersRef.current.cls.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }

    // Track First Contentful Paint from PerformancePaintTiming
    if ('performance' in window && 'getEntriesByType' in performance) {
      const paintEntries = performance.getEntriesByType(
        'paint'
      ) as PerformancePaintTiming[];
      const fcpEntry = paintEntries.find(
        entry => entry.name === 'first-contentful-paint'
      );

      if (fcpEntry) {
        setMetrics(prev => ({
          ...prev,
          firstContentfulPaint: fcpEntry.startTime,
        }));
      }
    }
  }, [componentName, fullConfig.alertThresholds]);

  /**
   * Track memory usage
   */
  const trackMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryMetrics = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
      };

      setMetrics(prev => ({ ...prev, memoryUsage: memoryMetrics }));

      // Alert on high memory usage (80% of limit)
      if (memoryMetrics.used > memoryMetrics.limit * 0.8) {
        reportPerformanceIssue('high_memory', {
          componentName,
          memoryUsed: memoryMetrics.used,
          memoryLimit: memoryMetrics.limit,
        });
      }
    }
  }, [componentName]);

  /**
   * Track network performance
   */
  const trackNetworkPerformance = useCallback(() => {
    if ('performance' in window && 'getEntriesByType' in performance) {
      // Navigation timing
      const navEntries = performance.getEntriesByType(
        'navigation'
      ) as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        setMetrics(prev => ({ ...prev, navigationTiming: navEntries[0] }));
      }

      // Resource timing
      const resourceEntries = performance.getEntriesByType(
        'resource'
      ) as PerformanceResourceTiming[];
      setMetrics(prev => ({ ...prev, resourceTiming: resourceEntries }));
    }
  }, []);

  /**
   * Report performance issue
   */
  const reportPerformanceIssue = useCallback(
    (type: string, data: any) => {
      console.warn(`Performance issue detected: ${type}`, data);

      // Send to monitoring service if endpoint configured
      if (fullConfig.reportingEndpoint) {
        fetch(fullConfig.reportingEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'performance_issue',
            issueType: type,
            componentName,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ...data,
          }),
        }).catch(console.error);
      }

      // Track with analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'performance_issue', {
          event_category: 'Performance',
          event_label: type,
          value: Math.round(
            data.renderTime || data.lcp || data.fid || data.cls * 1000 || 0
          ),
        });
      }
    },
    [componentName, fullConfig.reportingEndpoint]
  );

  /**
   * Manually track custom metric
   */
  const trackCustomMetric = useCallback((name: string, value: number) => {
    setMetrics(prev => ({
      ...prev,
      customMetrics: {
        ...prev.customMetrics,
        [name]: value,
      },
    }));
  }, []);

  /**
   * Start timing operation
   */
  const startTiming = useCallback(
    (operationName: string) => {
      const startTime = performance.now();

      return {
        end: () => {
          const duration = performance.now() - startTime;
          trackCustomMetric(operationName, duration);
          return duration;
        },
      };
    },
    [trackCustomMetric]
  );

  /**
   * Get performance score based on Web Vitals
   */
  const getPerformanceScore = useCallback((): number => {
    let score = 100;

    if (
      metrics.largestContentfulPaint &&
      metrics.largestContentfulPaint > fullConfig.alertThresholds.lcp
    ) {
      score -= 25;
    }

    if (
      metrics.firstInputDelay &&
      metrics.firstInputDelay > fullConfig.alertThresholds.fid
    ) {
      score -= 25;
    }

    if (
      metrics.cumulativeLayoutShift &&
      metrics.cumulativeLayoutShift > fullConfig.alertThresholds.cls
    ) {
      score -= 25;
    }

    if (
      metrics.componentRenderTime &&
      metrics.componentRenderTime > fullConfig.alertThresholds.componentRender
    ) {
      score -= 25;
    }

    return Math.max(0, score);
  }, [metrics, fullConfig.alertThresholds]);

  /**
   * Clean up observers
   */
  const cleanup = useCallback(() => {
    Object.values(observersRef.current).forEach(observer => {
      if (observer) {
        observer.disconnect();
      }
    });
    setIsTracking(false);
  }, []);

  /**
   * Export performance data for reporting
   */
  const exportMetrics = useCallback(() => {
    return {
      componentName,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      performanceScore: getPerformanceScore(),
      ...metrics,
    };
  }, [componentName, metrics, getPerformanceScore]);

  return {
    metrics,
    isTracking,
    performanceScore: getPerformanceScore(),
    trackCustomMetric,
    startTiming,
    exportMetrics,
    reportPerformanceIssue,
  };
}

/**
 * HOC for automatic performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config?: Partial<PerformanceConfig>
) {
  const ComponentWithPerformanceMonitoring = (props: P) => {
    const componentName =
      WrappedComponent.displayName || WrappedComponent.name || 'Anonymous';
    const { metrics, isTracking } = usePerformanceMonitoring(
      componentName,
      config
    );

    return <WrappedComponent {...props} />;
  };

  ComponentWithPerformanceMonitoring.displayName = `withPerformanceMonitoring(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return ComponentWithPerformanceMonitoring;
}

export type { PerformanceMetrics, PerformanceConfig };
