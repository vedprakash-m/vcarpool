require('@testing-library/jest-dom');

// Fix TextEncoder/TextDecoder for MSW
require('text-encoding-polyfill');
global.TextDecoder = global.TextDecoder || require('util').TextDecoder;
global.TextEncoder = global.TextEncoder || require('util').TextEncoder;

// Mock BroadcastChannel
global.BroadcastChannel = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock Response for MSW
if (!global.Response) {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Map(Object.entries(init?.headers || {}));
    }

    json() {
      return Promise.resolve(
        typeof this.body === 'string' ? JSON.parse(this.body) : this.body
      );
    }

    text() {
      return Promise.resolve(
        typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
      );
    }
  };
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

// Mock matchMedia for accessibility tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock performance API for performance monitoring tests with sequential timing
let mockTime = 1000;
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => {
      const current = mockTime;
      mockTime += 25; // Always increment to ensure positive timing
      return current;
    }),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    navigation: {
      type: 0,
      redirectCount: 0,
    },
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
  },
});

// Mock PerformanceObserver for performance monitoring
global.PerformanceObserver = jest.fn().mockImplementation(callback => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
}));

// Mock scrollIntoView for accessibility tests
Element.prototype.scrollIntoView = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001';
process.env.NEXT_PUBLIC_ENABLE_LEGACY_AUTH = 'true';
process.env.NEXT_PUBLIC_ENABLE_ENTRA_AUTH = 'true';
process.env.NEXT_PUBLIC_ENVIRONMENT = 'test';
