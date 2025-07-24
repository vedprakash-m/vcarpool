/**
 * Tests for usePerformance hooks
 * Testing performance monitoring, debouncing, and throttling hooks
 */

import { renderHook, act } from '@testing-library/react';
import {
  usePerformanceMonitor,
  useDebounce,
  useThrottle,
} from '../../hooks/usePerformance';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
  },
  writable: true,
});

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
  });

  it('should initialize with zero metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    expect(result.current.metrics).toEqual({
      renderTime: 0,
      loadTime: 0,
      interactionTime: 0,
    });
  });

  it('should measure render time correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    // Start timer
    mockPerformanceNow.mockReturnValue(0);
    act(() => {
      result.current.startTimer();
    });

    // End timer after 50ms
    mockPerformanceNow.mockReturnValue(50);
    act(() => {
      result.current.endTimer('render');
    });

    expect(result.current.metrics.renderTime).toBe(50);
    expect(result.current.metrics.loadTime).toBe(0);
    expect(result.current.metrics.interactionTime).toBe(0);
  });

  it('should measure load time correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    mockPerformanceNow.mockReturnValue(10);
    act(() => {
      result.current.startTimer();
    });

    mockPerformanceNow.mockReturnValue(75);
    act(() => {
      result.current.endTimer('load');
    });

    expect(result.current.metrics.loadTime).toBe(65);
  });

  it('should measure interaction time correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    mockPerformanceNow.mockReturnValue(100);
    act(() => {
      result.current.startTimer();
    });

    mockPerformanceNow.mockReturnValue(130);
    act(() => {
      result.current.endTimer('interaction');
    });

    expect(result.current.metrics.interactionTime).toBe(30);
  });

  it('should warn for slow operations', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const { result } = renderHook(() => usePerformanceMonitor());

    mockPerformanceNow.mockReturnValue(0);
    act(() => {
      result.current.startTimer();
    });

    // Simulate slow operation (>100ms)
    mockPerformanceNow.mockReturnValue(150);
    act(() => {
      result.current.endTimer('render');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Slow render operation: 150.00ms');
    consoleSpy.mockRestore();
  });
});

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    // Change value
    rerender({ value: 'changed', delay: 500 });
    expect(result.current).toBe('initial'); // Should still be initial

    // Fast forward time by 499ms - should still be initial
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBe('initial');

    // Fast forward by 1ms more (total 500ms) - should now be changed
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('changed');
  });

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    // First change
    rerender({ value: 'first', delay: 500 });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // Second change before timer completes
    rerender({ value: 'second', delay: 500 });
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current).toBe('initial'); // Should still be initial

    // Complete the timer
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('second');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 100 },
      }
    );

    rerender({ value: 'changed', delay: 100 });

    act(() => {
      jest.advanceTimersByTime(99);
    });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('changed');
  });
});

describe('useThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call function immediately on first call', () => {
    const mockFn = jest.fn();
    const { result } = renderHook(() => useThrottle(mockFn, 500));

    act(() => {
      result.current('arg1', 'arg2');
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should throttle subsequent calls', () => {
    const mockFn = jest.fn();
    const { result } = renderHook(() => useThrottle(mockFn, 500));

    // First call - should execute immediately
    act(() => {
      result.current('call1');
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('call1');

    // Second call within throttle period - should be delayed
    act(() => {
      result.current('call2');
    });

    // Still only first call executed
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Fast forward time to trigger the delayed call
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // The second call should now be executed
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith('call2');
  });

  it('should preserve function arguments', () => {
    const mockFn = jest.fn();
    const { result } = renderHook(() => useThrottle(mockFn, 500));

    act(() => {
      result.current(1, 'test', { key: 'value' });
    });

    expect(mockFn).toHaveBeenCalledWith(1, 'test', { key: 'value' });
  });

  it('should handle different delay values', () => {
    const mockFn = jest.fn();
    const { result } = renderHook(() => useThrottle(mockFn, 100));

    act(() => {
      result.current('first');
    });

    act(() => {
      result.current('second');
    });

    expect(mockFn).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    act(() => {
      result.current('third');
    });

    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should return stable function reference', () => {
    const mockFn = jest.fn();
    const { result, rerender } = renderHook(() => useThrottle(mockFn, 500));

    const throttledFn1 = result.current;
    rerender();
    const throttledFn2 = result.current;

    expect(throttledFn1).toBe(throttledFn2);
  });
});
