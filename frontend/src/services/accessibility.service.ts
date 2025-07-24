/**
 * Accessibility Utility Service
 * Provides WCAG 2.1 AA compliance features and accessibility helpers
 */

import { useEffect, useRef, useState } from 'react';

export interface AccessibilityConfig {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface FocusManagement {
  trapFocus: (container: HTMLElement) => () => void;
  announceLive: (message: string, priority?: 'polite' | 'assertive') => void;
  manageFocus: (element: HTMLElement | null) => void;
}

class AccessibilityService {
  private liveRegion: HTMLElement | null = null;
  private announceTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.createLiveRegion();
      this.detectPreferences();
    }
  }

  private createLiveRegion(): void {
    if (!this.liveRegion) {
      this.liveRegion = document.createElement('div');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.className = 'sr-only';
      this.liveRegion.style.cssText = `
        position: absolute !important;
        left: -10000px !important;
        width: 1px !important;
        height: 1px !important;
        overflow: hidden !important;
        clip: rect(1px, 1px, 1px, 1px) !important;
        white-space: nowrap !important;
      `;
      document.body.appendChild(this.liveRegion);
    }
  }

  getAccessibilityConfig(): AccessibilityConfig {
    if (typeof window === 'undefined') {
      return {
        reducedMotion: false,
        highContrast: false,
        largeText: false,
        screenReader: false,
        keyboardNavigation: false,
      };
    }

    return {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: window.matchMedia('(prefers-reduced-data: reduce)').matches,
      screenReader: this.detectScreenReader(),
      keyboardNavigation: this.detectKeyboardNavigation(),
    };
  }

  private detectScreenReader(): boolean {
    // Common screen reader detection methods
    return !!(
      (window as any).speechSynthesis ||
      (navigator as any).userAgent?.includes('NVDA') ||
      (navigator as any).userAgent?.includes('JAWS') ||
      (navigator as any).userAgent?.includes('VoiceOver')
    );
  }

  private detectKeyboardNavigation(): boolean {
    // Detect if user is navigating with keyboard
    let keyboardUser = false;

    const handleFirstTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        keyboardUser = true;
        document.body.classList.add('keyboard-navigation');
        window.removeEventListener('keydown', handleFirstTab);
      }
    };

    const handleMouseDown = () => {
      keyboardUser = false;
      document.body.classList.remove('keyboard-navigation');
    };

    window.addEventListener('keydown', handleFirstTab);
    window.addEventListener('mousedown', handleMouseDown);

    return keyboardUser;
  }

  private detectPreferences(): void {
    // Apply CSS classes based on user preferences
    const config = this.getAccessibilityConfig();

    if (config.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    }

    if (config.highContrast) {
      document.documentElement.classList.add('high-contrast');
    }
  }

  announceLive(
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ): void {
    if (!this.liveRegion) return;

    // Clear previous announcement
    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
    }

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = '';

    // Small delay to ensure screen readers pick up the change
    this.announceTimeout = setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, 100);
  }

  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    // Safety check for empty focusable elements
    if (focusableElements.length === 0) {
      console.warn('No focusable elements found in container');
      return () => {}; // Return empty cleanup function
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Allow custom escape handling
        container.dispatchEvent(new CustomEvent('escape-pressed'));
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);

    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };
  }

  createSkipLink(
    targetId: string,
    text: string = 'Skip to main content'
  ): HTMLElement {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 9999;
      border-radius: 4px;
      transition: top 0.2s ease-in-out;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    return skipLink;
  }

  validateColorContrast(
    foreground: string,
    background: string
  ): {
    ratio: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  } {
    const getLuminance = (color: string): number => {
      // Convert hex to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      // Calculate relative luminance
      const toLinear = (c: number) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
      ratio: Math.round(ratio * 100) / 100,
      wcagAA: ratio >= 4.5,
      wcagAAA: ratio >= 7,
    };
  }

  addAccessibilityAttributes(
    element: HTMLElement,
    options: {
      label?: string;
      description?: string;
      expanded?: boolean;
      controls?: string;
      hasPopup?: boolean | string;
      live?: 'polite' | 'assertive' | 'off';
      atomic?: boolean;
    }
  ): void {
    if (options.label) {
      element.setAttribute('aria-label', options.label);
    }

    if (options.description) {
      const descId = `desc-${Math.random().toString(36).substr(2, 9)}`;
      const descElement = document.createElement('div');
      descElement.id = descId;
      descElement.textContent = options.description;
      descElement.className = 'sr-only';
      element.parentNode?.appendChild(descElement);
      element.setAttribute('aria-describedby', descId);
    }

    if (typeof options.expanded === 'boolean') {
      element.setAttribute('aria-expanded', options.expanded.toString());
    }

    if (options.controls) {
      element.setAttribute('aria-controls', options.controls);
    }

    if (options.hasPopup) {
      element.setAttribute('aria-haspopup', options.hasPopup.toString());
    }

    if (options.live) {
      element.setAttribute('aria-live', options.live);
    }

    if (typeof options.atomic === 'boolean') {
      element.setAttribute('aria-atomic', options.atomic.toString());
    }
  }
}

// React Hook for Accessibility Features
export function useAccessibility() {
  const [config, setConfig] = useState<AccessibilityConfig>({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
    keyboardNavigation: false,
  });

  const serviceRef = useRef<AccessibilityService | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    try {
      serviceRef.current = new AccessibilityService();
      setConfig(serviceRef.current.getAccessibilityConfig());
      setHasError(false);

      // Listen for preference changes
      const handlePrefChange = () => {
        if (serviceRef.current) {
          try {
            setConfig(serviceRef.current.getAccessibilityConfig());
          } catch (error) {
            console.warn('Accessibility service configuration error:', error);
          }
        }
      };

      const mediaQueries = [
        window.matchMedia('(prefers-reduced-motion: reduce)'),
        window.matchMedia('(prefers-contrast: high)'),
      ];

      mediaQueries.forEach(mq => mq.addEventListener('change', handlePrefChange));

      return () => {
        mediaQueries.forEach(mq =>
          mq.removeEventListener('change', handlePrefChange)
        );
      };
    } catch (error) {
      console.warn('Accessibility service initialization error:', error);
      setHasError(true);
      // Return cleanup function even on error
      return () => {};
    }
  }, []);

  const announceLive = (message: string, priority?: 'polite' | 'assertive') => {
    serviceRef.current?.announceLive(message, priority);
  };

  const trapFocus = (container: HTMLElement) => {
    return serviceRef.current?.trapFocus(container) || (() => {});
  };

  const validateContrast = (foreground: string, background: string) => {
    return (
      serviceRef.current?.validateColorContrast(foreground, background) || {
        ratio: 0,
        wcagAA: false,
        wcagAAA: false,
      }
    );
  };

  return {
    config,
    announceLive,
    trapFocus,
    validateContrast,
    service: serviceRef.current,
  };
}

// Custom Hook for Focus Management
export function useFocusManagement() {
  const previousFocus = useRef<HTMLElement | null>(null);

  const saveFocus = () => {
    previousFocus.current = document.activeElement as HTMLElement;
  };

  const restoreFocus = () => {
    if (
      previousFocus.current &&
      typeof previousFocus.current.focus === 'function'
    ) {
      previousFocus.current.focus();
    }
  };

  const focusElement = (selector: string | HTMLElement) => {
    let element: HTMLElement | null = null;

    if (typeof selector === 'string') {
      element = document.querySelector(selector);
    } else {
      element = selector;
    }

    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  };

  return {
    saveFocus,
    restoreFocus,
    focusElement,
  };
}

export default AccessibilityService;
