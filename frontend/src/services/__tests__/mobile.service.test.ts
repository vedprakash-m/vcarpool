import { MobileService } from '../mobile.service';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches:
      query.includes('(display-mode: standalone)') ||
      query.includes('(prefers-reduced-motion: reduce)'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock TouchEvent constructor for JSDOM
const mockTouchEvent = function (type: string, eventInitDict: any = {}) {
  const event = new Event(type, eventInitDict);
  Object.assign(event, {
    touches: eventInitDict.touches || [],
    changedTouches: eventInitDict.changedTouches || [],
    targetTouches: eventInitDict.targetTouches || [],
  });
  return event;
};

// Assign to global for JSDOM
global.TouchEvent = mockTouchEvent as any;

// Mock CSS.supports
Object.defineProperty(window, 'CSS', {
  value: {
    supports: jest.fn().mockImplementation((property, value) => {
      return (
        property === 'padding-top' &&
        (value === 'env(safe-area-inset-top)' ||
          value === 'constant(safe-area-inset-top)')
      );
    }),
  },
  writable: true,
});

describe('MobileService', () => {
  beforeEach(() => {
    // Reset DOM and global mocks
    document.body.innerHTML = '';
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        maxTouchPoints: 5,
        vibrate: jest.fn(),
      },
      writable: true,
    });

    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      writable: true,
    });

    Object.defineProperty(window, 'innerHeight', {
      value: 667,
      writable: true,
    });

    // Reset matchMedia mock but preserve implementation
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches:
        query.includes('(display-mode: standalone)') ||
        query.includes('(prefers-reduced-motion: reduce)'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  describe('Device Detection', () => {
    it('detects mobile device correctly', () => {
      expect(MobileService.isMobile()).toBe(true);
    });

    it('detects tablet device correctly', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X)',
          maxTouchPoints: 5,
        },
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 820, // Must be > 768 for tablet detection
        writable: true,
      });

      expect(MobileService.isTablet()).toBe(true);
    });

    it('detects desktop device correctly', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          maxTouchPoints: 0,
        },
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
      });

      expect(MobileService.isMobile()).toBe(false);
      expect(MobileService.isTablet()).toBe(false);
    });

    it('detects touch support correctly', () => {
      expect(MobileService.isTouchDevice()).toBe(true);
    });
  });

  describe('Viewport Utils', () => {
    it('gets viewport dimensions correctly', () => {
      const viewport = MobileService.getViewportDimensions();
      expect(viewport.width).toBe(375);
      expect(viewport.height).toBe(667);
    });

    it('detects portrait orientation', () => {
      expect(MobileService.isPortrait()).toBe(true);
    });

    it('detects landscape orientation', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 667,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 375,
        writable: true,
      });

      expect(MobileService.isPortrait()).toBe(false);
    });
  });
  describe('Gesture Handling', () => {
    it('initializes touch tracking correctly', done => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      const mockCallback = jest.fn();
      MobileService.initializeTouchTracking(element, mockCallback);

      // Simulate touch start and end for a swipe
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 } as Touch],
      });

      element.dispatchEvent(touchStart);
      // Small delay to simulate gesture timing
      setTimeout(() => {
        element.dispatchEvent(touchEnd);

        // Check that callback was called with swipe gesture
        expect(mockCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            direction: 'right',
            distance: expect.any(Number),
            velocity: expect.any(Number),
            duration: expect.any(Number),
          })
        );
        done();
      }, 50);
    });

    it('tracks swipe gestures correctly', done => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      MobileService.addSwipeListener(element, direction => {
        expect(direction).toBe('right');
        done();
      });

      // Simulate swipe right
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 50, clientY: 100 } as Touch],
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200, clientY: 100 } as Touch],
      });

      element.dispatchEvent(touchStart);
      setTimeout(() => {
        element.dispatchEvent(touchEnd);
      }, 100);
    });

    it('detects pinch gestures correctly', done => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      MobileService.addPinchListener(element, scale => {
        expect(scale).toBeCloseTo(1.5, 1);
        done();
      });

      // Simulate pinch zoom
      const touchStart = new TouchEvent('touchstart', {
        touches: [
          { clientX: 100, clientY: 100 } as Touch,
          { clientX: 200, clientY: 100 } as Touch,
        ],
      });
      const touchMove = new TouchEvent('touchmove', {
        touches: [
          { clientX: 80, clientY: 100 } as Touch,
          { clientX: 220, clientY: 100 } as Touch,
        ],
      });

      element.dispatchEvent(touchStart);
      element.dispatchEvent(touchMove);
    });
  });

  describe('Mobile Optimizations', () => {
    it('optimizes scrolling performance', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      MobileService.optimizeScrolling(element);

      expect((element.style as any).webkitOverflowScrolling).toBe('touch');
      expect((element.style as any).overflowScrolling).toBe('touch');
    });

    it('prevents zoom on input focus', () => {
      // Create viewport meta tag
      const viewportMeta = document.createElement('meta');
      viewportMeta.name = 'viewport';
      viewportMeta.content = 'width=device-width, initial-scale=1';
      document.head.appendChild(viewportMeta);

      const input = document.createElement('input');
      document.body.appendChild(input);

      MobileService.preventInputZoom(input);

      const focusEvent = new Event('focus');
      input.dispatchEvent(focusEvent);

      expect(viewportMeta.content).toContain('user-scalable=no');
    });

    it('enables safe area support', () => {
      MobileService.enableSafeAreaSupport();

      const style = document.head.querySelector('style');
      expect(style?.textContent).toContain('env(safe-area-inset-');
    });
  });

  describe('Performance Optimizations', () => {
    it('reduces motion for accessibility', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      expect(MobileService.shouldReduceMotion()).toBe(true);
    });

    it('optimizes animation performance', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      MobileService.optimizeAnimations(element);

      expect(element.style.transform).toBe('translateZ(0)');
      expect(element.style.backfaceVisibility).toBe('hidden');
      expect(element.style.willChange).toBe('transform');
    });

    it('lazy loads images correctly', done => {
      const img = document.createElement('img');
      img.setAttribute('data-src', 'test-image.jpg');
      document.body.appendChild(img);

      // Mock IntersectionObserver
      global.IntersectionObserver = jest.fn().mockImplementation(callback => ({
        observe: jest.fn().mockImplementation(() => {
          callback([{ isIntersecting: true, target: img }]);
        }),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));

      MobileService.enableLazyLoading();

      setTimeout(() => {
        expect(img.src).toContain('test-image.jpg');
        done();
      }, 100);
    });
  });

  describe('Haptic Feedback', () => {
    it('provides haptic feedback when supported', () => {
      const mockVibrate = jest.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
      });

      MobileService.hapticFeedback('light');
      expect(mockVibrate).toHaveBeenCalledWith(10);

      MobileService.hapticFeedback('medium');
      expect(mockVibrate).toHaveBeenCalledWith(20);

      MobileService.hapticFeedback('heavy');
      expect(mockVibrate).toHaveBeenCalledWith(30);
    });

    it('handles missing vibration API gracefully', () => {
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
      });

      expect(() => MobileService.hapticFeedback('light')).not.toThrow();
    });
  });

  describe('Network Detection', () => {
    it('detects network status correctly', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });

      expect(MobileService.isOnline()).toBe(true);
    });

    it('detects slow network connections', () => {
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 300,
        },
        writable: true,
      });

      expect(MobileService.isSlowConnection()).toBe(true);
    });

    it('adds network change listeners', done => {
      MobileService.addNetworkListener(isOnline => {
        expect(isOnline).toBe(false);
        done();
      });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
    });
  });

  describe('Battery API', () => {
    it('gets battery status when supported', async () => {
      const mockBattery = {
        level: 0.8,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: 3600,
      };

      Object.defineProperty(navigator, 'getBattery', {
        value: jest.fn().mockResolvedValue(mockBattery),
        writable: true,
      });

      const battery = await MobileService.getBatteryStatus();
      expect(battery?.level).toBe(0.8);
      expect(battery?.charging).toBe(false);
    });

    it('handles missing battery API gracefully', async () => {
      Object.defineProperty(navigator, 'getBattery', {
        value: undefined,
        writable: true,
      });

      const battery = await MobileService.getBatteryStatus();
      expect(battery).toBeNull();
    });
  });
});
