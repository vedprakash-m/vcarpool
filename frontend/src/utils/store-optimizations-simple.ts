/**
 * Simplified State Management Optimizations
 * Basic Zustand store patterns and utilities
 */

import React from 'react';
import { create } from 'zustand';

/**
 * Simple cache implementation
 */
class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttl: number = 300000): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  invalidate(keyPattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const storeCache = new SimpleCache();

/**
 * Simple store factory
 */
export function createOptimizedStore<T extends Record<string, any>>(
  initialState: T
) {
  return create<T>(() => initialState);
}

/**
 * Performance transition utilities
 */
export function withTransition(callback: () => void): void {
  if (React.startTransition) {
    React.startTransition(() => {
      callback();
    });
  } else {
    callback();
  }
}

/**
 * Debounced updates hook
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
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
 * Optimized state selector
 */
export function useOptimizedSelector<T, R>(
  store: T,
  selector: (state: T) => R
): R {
  return React.useMemo(() => selector(store), [store, selector]);
}

/**
 * Simple trip store interface
 */
interface TripState {
  trips: any[];
  loading: boolean;
  error: string | null;
}

interface TripActions {
  setTrips: (trips: any[]) => void;
  addTrip: (trip: any) => void;
  updateTrip: (id: string, updates: any) => void;
  removeTrip: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSimpleTripStore = create<TripState & TripActions>(set => ({
  // State
  trips: [],
  loading: false,
  error: null,

  // Actions
  setTrips: trips => set({ trips }),
  addTrip: trip => set(state => ({ trips: [trip, ...state.trips] })),
  updateTrip: (id, updates) =>
    set(state => ({
      trips: state.trips.map((trip: any) =>
        trip.id === id ? { ...trip, ...updates } : trip
      ),
    })),
  removeTrip: id =>
    set(state => ({
      trips: state.trips.filter((trip: any) => trip.id !== id),
    })),
  setLoading: loading => set({ loading }),
  setError: error => set({ error }),
}));
