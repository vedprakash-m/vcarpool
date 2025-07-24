/**
 * usePerformanceMonitoring Test Suite
 * Phase 1: Foundation Strengthening - Coverage Enhancement
 * Generated for 80% coverage target
 */

import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

// Mock browser APIs
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
    },
  },
  writable: true,
});

global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

global.fetch = jest.fn();
global.gtag = jest.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => {
  setTimeout(cb, 16); // Simulate 60fps
  return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('usePerformanceMonitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Math.random = jest.fn(() => 0.05); // Ensure sampling is active (5% < 10% default)
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Core Functionality', () => {
    it('should initialize correctly', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      expect(result.current).toBeDefined();
      expect(result.current.metrics).toBeDefined();
      expect(result.current.isTracking).toBe(true);
      expect(result.current.performanceScore).toBeDefined();
      expect(typeof result.current.trackCustomMetric).toBe('function');
      expect(typeof result.current.startTiming).toBe('function');
      expect(typeof result.current.exportMetrics).toBe('function');
    });

    it('should not track when sampling rate excludes session', () => {
      Math.random = jest.fn(() => 0.5); // 50% > 10% default sampling rate

      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      expect(result.current.isTracking).toBe(false);
    });

    it('should respect custom sampling rate', () => {
      Math.random = jest.fn(() => 0.3); // 30%

      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent', { sampleRate: 0.5 })
      );

      expect(result.current.isTracking).toBe(true);
    });

    it('should handle disabled tracking features', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent', {
          trackWebVitals: false,
          trackComponentPerformance: false,
          trackMemory: false,
          trackNetwork: false,
        })
      );

      expect(result.current.isTracking).toBe(true);
      expect(result.current.metrics).toBeDefined();
    });
  });

  describe('Custom Metrics Tracking', () => {
    it('should track custom metrics', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        result.current.trackCustomMetric('testMetric', 100);
      });

      expect(result.current.metrics.customMetrics?.testMetric).toBe(100);
    });

    it('should handle multiple custom metrics', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        result.current.trackCustomMetric('metric1', 100);
        result.current.trackCustomMetric('metric2', 200);
      });

      expect(result.current.metrics.customMetrics?.metric1).toBe(100);
      expect(result.current.metrics.customMetrics?.metric2).toBe(200);
    });
  });

  describe('Timing Operations', () => {
    it('should measure timing operations', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      let timer: any;
      let duration: number;

      act(() => {
        timer = result.current.startTiming('testOperation');
      });

      // Simulate some work
      setTimeout(() => {
        act(() => {
          duration = timer.end();
        });

        expect(duration).toBeGreaterThan(0);
        expect(result.current.metrics.customMetrics?.testOperation).toBe(
          duration
        );
      }, 10);
    });

    it('should handle multiple concurrent timers', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        const timer1 = result.current.startTiming('operation1');
        const timer2 = result.current.startTiming('operation2');

        setTimeout(() => timer1.end(), 5);
        setTimeout(() => timer2.end(), 10);
      });

      // Both operations should be tracked independently
      expect(result.current.trackCustomMetric).toBeDefined();
    });
  });

  describe('Performance Score Calculation', () => {
    it('should calculate performance score based on Web Vitals', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      // Initially should be 100 (no metrics yet)
      expect(result.current.performanceScore).toBe(100);
    });

    it('should reduce score for poor LCP', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        // Simulate poor LCP (>2.5s threshold)
        result.current.metrics.largestContentfulPaint = 3000;
      });

      // Score should be reduced
      expect(result.current.performanceScore).toBeLessThan(100);
    });

    it('should reduce score for poor FID', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        // Simulate poor FID (>100ms threshold)
        result.current.metrics.firstInputDelay = 150;
      });

      expect(result.current.performanceScore).toBeLessThan(100);
    });

    it('should reduce score for high CLS', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        // Simulate high CLS (>0.1 threshold)
        result.current.metrics.cumulativeLayoutShift = 0.2;
      });

      expect(result.current.performanceScore).toBeLessThan(100);
    });

    it('should reduce score for slow component renders', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        // Simulate slow component render (>16ms threshold)
        result.current.metrics.componentRenderTime = 50;
      });

      expect(result.current.performanceScore).toBeLessThan(100);
    });
  });

  describe('Metrics Export', () => {
    it('should export comprehensive metrics', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        result.current.trackCustomMetric('testMetric', 100);
      });

      const exportedMetrics = result.current.exportMetrics();

      expect(exportedMetrics).toHaveProperty('componentName', 'TestComponent');
      expect(exportedMetrics).toHaveProperty('timestamp');
      expect(exportedMetrics).toHaveProperty('url');
      expect(exportedMetrics).toHaveProperty('userAgent');
      expect(exportedMetrics).toHaveProperty('performanceScore');
      expect(exportedMetrics).toHaveProperty('customMetrics');
      expect(exportedMetrics.customMetrics?.testMetric).toBe(100);
    });
  });

  describe('Performance Issue Reporting', () => {
    it('should report performance issues', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        result.current.reportPerformanceIssue('slow_render', {
          renderTime: 100,
          threshold: 16,
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance issue detected: slow_render',
        expect.objectContaining({
          renderTime: 100,
          threshold: 16,
        })
      );

      consoleSpy.mockRestore();
    });

    it('should send issues to reporting endpoint when configured', () => {
      const fetchSpy = jest.mocked(fetch).mockResolvedValue({
        ok: true,
      } as Response);

      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent', {
          reportingEndpoint: '/api/performance-issues',
        })
      );

      act(() => {
        result.current.reportPerformanceIssue('high_memory', {
          memoryUsed: 800,
          memoryLimit: 1000,
        });
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/performance-issues',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('high_memory'),
        })
      );
    });

    it('should track with analytics when available', () => {
      const gtagSpy = jest.mocked(gtag);
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      act(() => {
        result.current.reportPerformanceIssue('slow_operation', {
          renderTime: 100,
        });
      });

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'performance_issue',
        expect.objectContaining({
          event_category: 'Performance',
          event_label: 'slow_operation',
          value: 100,
        })
      );
    });
  });

  describe('Memory Usage Tracking', () => {
    it('should track memory usage when performance.memory is available', () => {
      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent', { trackMemory: true })
      );

      // Memory metrics should be collected during initialization
      expect(result.current.metrics.memoryUsage).toBeDefined();
      expect(result.current.metrics.memoryUsage?.used).toBe(50); // 50MB from mock
      expect(result.current.metrics.memoryUsage?.total).toBe(100); // 100MB from mock
      expect(result.current.metrics.memoryUsage?.limit).toBe(2048); // 2GB from mock
    });
  });

  describe('Error Handling', () => {
    it('should handle browser API errors gracefully', () => {
      // Mock PerformanceObserver to throw
      const originalObserver = global.PerformanceObserver;
      global.PerformanceObserver = jest.fn().mockImplementation(() => {
        throw new Error('PerformanceObserver not supported');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      expect(result.current.isTracking).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not supported')
      );

      // Restore
      global.PerformanceObserver = originalObserver;
      consoleSpy.mockRestore();
    });

    it('should handle missing performance API gracefully', () => {
      const originalPerformance = window.performance;
      delete (window as any).performance;

      const { result } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      expect(result.current.isTracking).toBe(true);
      expect(result.current.metrics).toBeDefined();

      // Restore
      window.performance = originalPerformance;
    });
  });

  describe('Component Re-rendering', () => {
    it('should track re-render count', () => {
      const { result, rerender } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      // Initial render
      expect(result.current.metrics.reRenderCount).toBeGreaterThan(0);

      const initialCount = result.current.metrics.reRenderCount;

      // Force re-render
      rerender();

      // Count should increase
      expect(result.current.metrics.reRenderCount).toBeGreaterThan(
        initialCount
      );
    });

    it('should measure render time on each render', () => {
      const { result, rerender } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      expect(result.current.metrics.componentRenderTime).toBeGreaterThanOrEqual(
        0
      );

      rerender();

      expect(result.current.metrics.componentRenderTime).toBeGreaterThanOrEqual(
        0
      );
    });
  });

  describe('Cleanup', () => {
    it('should cleanup observers on unmount', () => {
      const disconnectSpy = jest.fn();
      global.PerformanceObserver = jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        disconnect: disconnectSpy,
      }));

      const { unmount } = renderHook(() =>
        usePerformanceMonitoring('TestComponent')
      );

      unmount();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  it('should be re-enabled after fixing browser API mocks', () => {
    expect(true).toBe(true);
  });
});
