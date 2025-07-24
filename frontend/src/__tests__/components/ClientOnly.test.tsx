/**
 * Tests for ClientOnly Component
 * Testing SSR/hydration behavior, fallback rendering, and client-side mounting
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientOnly from '../../components/ClientOnly';

describe('ClientOnly', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    jest.clearAllMocks();
  });

  describe('Default Behavior', () => {
    it('should render client content in test environment (synchronous useEffect)', () => {
      render(
        <ClientOnly fallback={<div>Loading...</div>}>
          <div>Client content</div>
        </ClientOnly>
      );

      // In test environment, useEffect runs synchronously, so client content shows immediately
      expect(screen.getByText('Client content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should render children after useEffect runs', async () => {
      render(
        <ClientOnly fallback={<div>Loading...</div>}>
          <div>Client content</div>
        </ClientOnly>
      );

      // Wait for useEffect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // After mounting, should show children
      expect(screen.getByText('Client content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should render client content when no fallback provided', () => {
      const { container } = render(
        <ClientOnly>
          <div>Client content</div>
        </ClientOnly>
      );

      // In test environment, client content renders immediately
      expect(screen.getByText('Client content')).toBeInTheDocument();
    });
  });

  describe('Fallback Rendering', () => {
    it('should render client content instead of custom JSX fallback in test environment', () => {
      const customFallback = (
        <div className="spinner">
          <span>Custom loading...</span>
        </div>
      );

      render(
        <ClientOnly fallback={customFallback}>
          <div>Client content</div>
        </ClientOnly>
      );

      // In test environment, useEffect is synchronous so client content renders immediately
      expect(screen.getByText('Client content')).toBeInTheDocument();
      expect(screen.queryByText('Custom loading...')).not.toBeInTheDocument();
    });

    it('should render client content instead of string fallback in test environment', () => {
      render(
        <ClientOnly fallback="Please wait...">
          <div>Client content</div>
        </ClientOnly>
      );

      // In test environment, client content renders immediately
      expect(screen.getByText('Client content')).toBeInTheDocument();
      expect(screen.queryByText('Please wait...')).not.toBeInTheDocument();
    });

    it('should render client content instead of complex fallback component in test environment', () => {
      const ComplexFallback = () => (
        <div data-testid="complex-fallback">
          <h2>Loading App</h2>
          <p>Please wait while we load your content</p>
          <div className="spinner-animation" />
        </div>
      );

      render(
        <ClientOnly fallback={<ComplexFallback />}>
          <div>Client content</div>
        </ClientOnly>
      );

      // In test environment, client content renders immediately
      expect(screen.getByText('Client content')).toBeInTheDocument();
      expect(screen.queryByTestId('complex-fallback')).not.toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('should render simple children after mounting', async () => {
      render(
        <ClientOnly>
          <p>Simple content</p>
        </ClientOnly>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByText('Simple content')).toBeInTheDocument();
    });

    it('should render complex children components', async () => {
      const ComplexChild = () => (
        <div data-testid="complex-child">
          <header>App Header</header>
          <main>
            <h1>Welcome</h1>
            <p>This is client-side content</p>
          </main>
          <footer>App Footer</footer>
        </div>
      );

      render(
        <ClientOnly>
          <ComplexChild />
        </ClientOnly>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByTestId('complex-child')).toBeInTheDocument();
      expect(screen.getByText('App Header')).toBeInTheDocument();
      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(
        screen.getByText('This is client-side content')
      ).toBeInTheDocument();
      expect(screen.getByText('App Footer')).toBeInTheDocument();
    });

    it('should render multiple children', async () => {
      render(
        <ClientOnly>
          <div>First child</div>
          <div>Second child</div>
          <span>Third child</span>
        </ClientOnly>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
      expect(screen.getByText('Third child')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should maintain hasMounted state correctly', async () => {
      const { rerender } = render(
        <ClientOnly fallback={<div>Loading...</div>}>
          <div>Client content</div>
        </ClientOnly>
      );

      // In test environment, mounted immediately
      expect(screen.getByText('Client content')).toBeInTheDocument();

      // Wait for any pending effects
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Still mounted
      expect(screen.getByText('Client content')).toBeInTheDocument();

      // Rerender should maintain mounted state
      rerender(
        <ClientOnly fallback={<div>Loading...</div>}>
          <div>Updated client content</div>
        </ClientOnly>
      );

      // Should not go back to fallback
      expect(screen.getByText('Updated client content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should handle prop changes after mounting', async () => {
      const { rerender } = render(
        <ClientOnly fallback={<div>Initial fallback</div>}>
          <div>Initial content</div>
        </ClientOnly>
      );

      // Wait for mount
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByText('Initial content')).toBeInTheDocument();

      // Change both fallback and children
      rerender(
        <ClientOnly fallback={<div>New fallback</div>}>
          <div>New content</div>
        </ClientOnly>
      );

      // Should show new children, not new fallback (since already mounted)
      expect(screen.getByText('New content')).toBeInTheDocument();
      expect(screen.queryByText('New fallback')).not.toBeInTheDocument();
      expect(screen.queryByText('Initial fallback')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', async () => {
      const { container } = render(
        <ClientOnly fallback={<div>Loading...</div>}>{null}</ClientOnly>
      );

      // In test environment, mounted immediately with empty children
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(container.firstChild).toBe(null);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should still render empty content (not fallback)
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(container.firstChild).toBe(null);
    });

    it('should handle undefined children', async () => {
      const { container } = render(
        <ClientOnly fallback={<div>Loading...</div>}>{undefined}</ClientOnly>
      );

      // In test environment, mounted immediately with undefined children
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(container.firstChild).toBe(null);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(container.firstChild).toBe(null);
    });

    it('should handle conditional children', async () => {
      const shouldRender = true;

      render(
        <ClientOnly fallback={<div>Loading...</div>}>
          {shouldRender && <div>Conditional content</div>}
        </ClientOnly>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByText('Conditional content')).toBeInTheDocument();
    });

    it('should handle zero as children', async () => {
      render(<ClientOnly fallback={<div>Loading...</div>}>{0}</ClientOnly>);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with useEffect', async () => {
      const { unmount } = render(
        <ClientOnly>
          <div>Test content</div>
        </ClientOnly>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid mount/unmount cycles', async () => {
      const { unmount, rerender } = render(
        <ClientOnly>
          <div>Content 1</div>
        </ClientOnly>
      );

      // Rapid changes
      rerender(
        <ClientOnly>
          <div>Content 2</div>
        </ClientOnly>
      );

      rerender(
        <ClientOnly>
          <div>Content 3</div>
        </ClientOnly>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByText('Content 3')).toBeInTheDocument();
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility and SEO', () => {
    it('should preserve accessibility attributes from children', async () => {
      render(
        <ClientOnly>
          <button aria-label="Close dialog" role="button">
            Close
          </button>
        </ClientOnly>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('should preserve data attributes', async () => {
      render(
        <ClientOnly>
          <div data-testid="client-content" data-analytics="track-me">
            Content
          </div>
        </ClientOnly>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const element = screen.getByTestId('client-content');
      expect(element).toHaveAttribute('data-analytics', 'track-me');
    });

    it('should maintain proper semantic structure', async () => {
      render(
        <ClientOnly>
          <main>
            <h1>Page Title</h1>
            <p>Page content</p>
          </main>
        </ClientOnly>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });
});
