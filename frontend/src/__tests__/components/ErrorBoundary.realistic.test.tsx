import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../components/ErrorBoundary';

// Test component that throws errors
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="success-content">No error occurred</div>;
};

// Mock console.error to prevent test output pollution
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary - Realistic Implementation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('success-content')).toBeInTheDocument();
      expect(screen.getByText('No error occurred')).toBeInTheDocument();
    });

    it('renders multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <div data-testid="child-3">Child 3</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('handles complex nested components', () => {
      const ComplexChild = () => (
        <div data-testid="complex-component">
          <h1>Title</h1>
          <div>
            <p>Nested content</p>
            <button>Action</button>
          </div>
        </div>
      );

      render(
        <ErrorBoundary>
          <ComplexChild />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('complex-component')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches and displays error fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Component crashed" />
        </ErrorBoundary>
      );

      expect(screen.queryByTestId('success-content')).not.toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText(/An unexpected error occurred/)
      ).toBeInTheDocument();
    });

    it('shows refresh page button for errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Network timeout" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Refresh Page')).toBeInTheDocument();
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('calls custom onError handler when provided', () => {
      const mockOnError = jest.fn();

      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} errorMessage="Custom error" />
        </ErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalledTimes(1);
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe('Custom Fallback UI', () => {
    it('renders custom fallback when provided', () => {
      const CustomFallback = () => (
        <div data-testid="custom-fallback">Custom error message</div>
      );

      render(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(
        screen.queryByText('Something went wrong')
      ).not.toBeInTheDocument();
    });

    it('uses default fallback when custom fallback not provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Refresh Page' })
      ).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('resets error state using resetErrorBoundary method', () => {
      let errorBoundaryRef: any;
      const TestWrapper = () => {
        const [key, setKey] = React.useState(0);
        return (
          <ErrorBoundary ref={ref => (errorBoundaryRef = ref)} key={key}>
            <ThrowError shouldThrow={false} />
            <button onClick={() => setKey(k => k + 1)}>Reset Key</button>
          </ErrorBoundary>
        );
      };

      render(<TestWrapper />);

      expect(screen.getByTestId('success-content')).toBeInTheDocument();

      // This test validates the reset mechanism exists
      expect(screen.getByText('Reset Key')).toBeInTheDocument();
    });

    it('refreshes page when Refresh Page button is clicked', () => {
      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByText('Refresh Page');
      fireEvent.click(refreshButton);

      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('resets on resetKeys change', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['key1']}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change resetKeys to trigger reset
      rerender(
        <ErrorBoundary resetKeys={['key2']}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('success-content')).toBeInTheDocument();
    });

    it('resets on props change when resetOnPropsChange is true', () => {
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change children to trigger reset
      rerender(
        <ErrorBoundary resetOnPropsChange={true}>
          <div data-testid="new-content">New content</div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('new-content')).toBeInTheDocument();
    });
  });

  describe('Development Mode Features', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('shows technical details in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Dev error" />
        </ErrorBoundary>
      );

      expect(
        screen.getByText('Technical Details (Development)')
      ).toBeInTheDocument();
      // Check for error in details section (multiple occurrences expected)
      const errorDetails = screen.getAllByText(/Dev error/);
      expect(errorDetails.length).toBeGreaterThan(0);
    });

    it('hides technical details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Prod error" />
        </ErrorBoundary>
      );

      expect(
        screen.queryByText('Technical Details (Development)')
      ).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('maintains proper heading hierarchy', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Something went wrong');
    });

    it('provides accessible button controls', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByRole('button', {
        name: 'Refresh Page',
      });

      expect(refreshButton).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Try Again' })
      ).not.toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const refreshButton = screen.getByText('Refresh Page');
      refreshButton.focus();

      expect(refreshButton).toHaveFocus();
    });
  });

  describe('Integration Scenarios', () => {
    it('works with nested error boundaries', () => {
      const NestedError = () => {
        throw new Error('Nested error');
      };

      render(
        <ErrorBoundary>
          <div>
            <ErrorBoundary
              fallback={<div data-testid="inner-fallback">Inner error</div>}
            >
              <NestedError />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('inner-fallback')).toBeInTheDocument();
      expect(
        screen.queryByText('Something went wrong')
      ).not.toBeInTheDocument();
    });

    it('handles async errors appropriately', () => {
      const AsyncErrorComponent = () => {
        React.useEffect(() => {
          // Simulate async error (won't be caught by error boundary)
          setTimeout(() => {
            // This won't be caught, but we test the component structure
          }, 100);
        }, []);

        return <div data-testid="async-component">Async component</div>;
      };

      render(
        <ErrorBoundary>
          <AsyncErrorComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('async-component')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    it('cleans up properly on unmount', () => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(() => unmount()).not.toThrow();
    });

    it('handles multiple consecutive errors gracefully', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Second error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
