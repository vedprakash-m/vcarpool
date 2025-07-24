import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the SimpleCache class for testing
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

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

describe('SimpleCache', () => {
  let cache: SimpleCache<string>;

  beforeEach(() => {
    cache = new SimpleCache<string>();
  });

  it('stores and retrieves values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('respects TTL and expires entries', () => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    let mockTime = 1000000;
    Date.now = jest.fn(() => mockTime);

    cache.set('key1', 'value1', 1000); // 1 second TTL
    expect(cache.get('key1')).toBe('value1');

    // Advance time beyond TTL
    mockTime += 2000;
    expect(cache.get('key1')).toBeUndefined();

    // Restore original Date.now
    Date.now = originalNow;
  });

  it('checks if key exists with has method', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('clears all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.clear();

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  it('handles different data types', () => {
    const objectCache = new SimpleCache<{ id: number; name: string }>();
    const testObject = { id: 1, name: 'test' };

    objectCache.set('obj1', testObject);
    expect(objectCache.get('obj1')).toEqual(testObject);
  });
});
