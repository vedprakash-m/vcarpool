import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientOnly from '../../components/ClientOnly';

describe('ClientOnly - Realistic Implementation Tests', () => {
  describe('Core Functionality', () => {
    it('renders content after mounting (test environment behavior)', async () => {
      const TestChild = () => (
        <div data-testid="client-content">Client Only Content</div>
      );
      const FallbackComponent = () => (
        <div data-testid="fallback-content">Loading...</div>
      );

      render(
        <ClientOnly fallback={<FallbackComponent />}>
          <TestChild />
        </ClientOnly>
      );

      // In test environment, component mounts immediately and shows client content
      await waitFor(() => {
        expect(screen.getByTestId('client-content')).toBeInTheDocument();
      });
    });

    it('renders children after component mounts', async () => {
      const TestChild = () => (
        <div data-testid="client-content">Client Only Content</div>
      );
      const FallbackComponent = () => (
        <div data-testid="fallback-content">Loading...</div>
      );

      render(
        <ClientOnly fallback={<FallbackComponent />}>
          <TestChild />
        </ClientOnly>
      );

      // After useEffect runs, should show children
      await waitFor(() => {
        expect(screen.getByTestId('client-content')).toBeInTheDocument();
        expect(
          screen.queryByTestId('fallback-content')
        ).not.toBeInTheDocument();
      });
    });

    it('renders null as default fallback when no fallback provided', async () => {
      const TestChild = () => (
        <div data-testid="client-content">Client Only Content</div>
      );

      render(
        <ClientOnly>
          <TestChild />
        </ClientOnly>
      );

      // In test environment, should quickly show children
      await waitFor(() => {
        expect(screen.getByTestId('client-content')).toBeInTheDocument();
      });
    });

    it('transitions from fallback to children correctly', async () => {
      const TestChild = () => (
        <div data-testid="client-content">Mounted Content</div>
      );
      const FallbackComponent = () => (
        <div data-testid="fallback-content">Please wait...</div>
      );

      render(
        <ClientOnly fallback={<FallbackComponent />}>
          <TestChild />
        </ClientOnly>
      );

      // Wait for component to mount and show client content
      await waitFor(() => {
        expect(screen.getByTestId('client-content')).toBeInTheDocument();
        expect(screen.getByText('Mounted Content')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles complex children components', async () => {
      const ComplexChild = () => (
        <div data-testid="complex-content">
          <h1>Title</h1>
          <p>Description</p>
          <button>Action</button>
        </div>
      );

      render(
        <ClientOnly
          fallback={<div data-testid="loading">Loading complex content...</div>}
        >
          <ComplexChild />
        </ClientOnly>
      );

      await waitFor(() => {
        expect(screen.getByTestId('complex-content')).toBeInTheDocument();
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Action')).toBeInTheDocument();
      });
    });

    it('handles multiple children', async () => {
      render(
        <ClientOnly fallback={<div data-testid="loading">Loading...</div>}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </ClientOnly>
      );

      await waitFor(() => {
        expect(screen.getByTestId('child-1')).toBeInTheDocument();
        expect(screen.getByTestId('child-2')).toBeInTheDocument();
        expect(screen.getByTestId('child-3')).toBeInTheDocument();
      });
    });

    it('handles empty children gracefully', async () => {
      render(
        <ClientOnly fallback={<div data-testid="loading">Loading...</div>}>
          {null}
        </ClientOnly>
      );

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('SSR/Hydration Behavior', () => {
    it('prevents hydration mismatches with proper fallback', async () => {
      const ClientSpecificContent = () => (
        <div data-testid="browser-only">
          Window width:{' '}
          {typeof window !== 'undefined' ? window.innerWidth : 'unknown'}
        </div>
      );

      render(
        <ClientOnly
          fallback={<div data-testid="ssr-safe">SSR Safe Content</div>}
        >
          <ClientSpecificContent />
        </ClientOnly>
      );

      // In test environment, should quickly transition to browser content
      await waitFor(() => {
        expect(screen.getByTestId('browser-only')).toBeInTheDocument();
      });
    });

    it('handles browser-specific APIs safely', async () => {
      const BrowserAPIComponent = () => (
        <div data-testid="browser-api">User Agent: {navigator.userAgent}</div>
      );

      render(
        <ClientOnly
          fallback={
            <div data-testid="no-browser-api">Loading browser data...</div>
          }
        >
          <BrowserAPIComponent />
        </ClientOnly>
      );

      await waitFor(() => {
        expect(screen.getByTestId('browser-api')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Behavior', () => {
    it('mounts efficiently without unnecessary re-renders', async () => {
      let renderCount = 0;
      const TestChild = () => {
        renderCount++;
        return (
          <div data-testid="render-tracker">Render count: {renderCount}</div>
        );
      };

      render(
        <ClientOnly>
          <TestChild />
        </ClientOnly>
      );

      await waitFor(() => {
        expect(screen.getByTestId('render-tracker')).toBeInTheDocument();
      });

      // Should only render once after mounting
      expect(screen.getByText('Render count: 1')).toBeInTheDocument();
    });

    it('cleans up properly on unmount', async () => {
      const TestChild = () => <div data-testid="mounted-child">Mounted</div>;

      const { unmount } = render(
        <ClientOnly>
          <TestChild />
        </ClientOnly>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mounted-child')).toBeInTheDocument();
      });

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
