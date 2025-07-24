import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CalendarLoading } from '../../../components/calendar/CalendarLoading';

describe('CalendarLoading - Realistic Implementation Tests', () => {
  describe('Core Functionality', () => {
    it('renders loading state with spinner and text', () => {
      render(<CalendarLoading />);

      expect(screen.getByText('Loading schedule...')).toBeInTheDocument();
      expect(screen.getByText('Loading schedule...')).toHaveClass(
        'text-gray-600'
      );
    });

    it('displays centered layout structure', () => {
      const { container } = render(<CalendarLoading />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('text-center', 'py-8');
    });

    it('shows loading spinner with correct styling', () => {
      const { container } = render(<CalendarLoading />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass(
        'animate-spin',
        'rounded-full',
        'h-8',
        'w-8',
        'border-b-2',
        'border-blue-600',
        'mx-auto',
        'mb-4'
      );
    });
  });

  describe('Visual Structure', () => {
    it('maintains proper spacing between spinner and text', () => {
      const { container } = render(<CalendarLoading />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('mb-4');
    });

    it('centers spinner horizontally', () => {
      const { container } = render(<CalendarLoading />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('mx-auto');
    });

    it('applies consistent blue theme', () => {
      const { container } = render(<CalendarLoading />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-blue-600');
    });
  });

  describe('Accessibility', () => {
    it('provides readable loading text', () => {
      render(<CalendarLoading />);

      const loadingText = screen.getByText('Loading schedule...');
      expect(loadingText).toBeVisible();
      expect(loadingText.tagName).toBe('P');
    });

    it('maintains semantic HTML structure', () => {
      const { container } = render(<CalendarLoading />);

      const wrapper = container.firstChild;
      expect(wrapper?.nodeName).toBe('DIV');

      const textElement = screen.getByText('Loading schedule...');
      expect(textElement.tagName).toBe('P');
    });

    it('ensures loading state is perceivable', () => {
      render(<CalendarLoading />);

      // Text should be accessible to screen readers
      expect(screen.getByText('Loading schedule...')).toBeInTheDocument();

      // Visual loading indicator should be present
      const { container } = render(<CalendarLoading />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Component Behavior', () => {
    it('renders consistently on multiple renders', () => {
      const { unmount } = render(<CalendarLoading />);
      expect(screen.getByText('Loading schedule...')).toBeInTheDocument();

      unmount();

      render(<CalendarLoading />);
      expect(screen.getByText('Loading schedule...')).toBeInTheDocument();
    });

    it('maintains memoization behavior', () => {
      const MemoTester = () => (
        <div>
          <CalendarLoading />
          <CalendarLoading />
        </div>
      );

      render(<MemoTester />);

      const loadingTexts = screen.getAllByText('Loading schedule...');
      expect(loadingTexts).toHaveLength(2);
    });

    it('handles component lifecycle correctly', () => {
      const { unmount } = render(<CalendarLoading />);

      expect(screen.getByText('Loading schedule...')).toBeInTheDocument();
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('works within calendar container', () => {
      render(
        <div data-testid="calendar-container">
          <CalendarLoading />
        </div>
      );

      expect(screen.getByTestId('calendar-container')).toBeInTheDocument();
      expect(screen.getByText('Loading schedule...')).toBeInTheDocument();
    });

    it('handles multiple loading states', () => {
      render(
        <div>
          <CalendarLoading />
          <div>Other content</div>
          <CalendarLoading />
        </div>
      );

      const loadingTexts = screen.getAllByText('Loading schedule...');
      expect(loadingTexts).toHaveLength(2);
      expect(screen.getByText('Other content')).toBeInTheDocument();
    });

    it('maintains styling in different contexts', () => {
      const { container } = render(
        <div className="bg-gray-100 p-4">
          <CalendarLoading />
        </div>
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-blue-600');
      expect(screen.getByText('Loading schedule...')).toHaveClass(
        'text-gray-600'
      );
    });
  });

  describe('Performance and Memory', () => {
    it('renders efficiently', () => {
      const startTime = performance.now();
      render(<CalendarLoading />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    it('cleans up properly on unmount', () => {
      const { unmount } = render(<CalendarLoading />);

      expect(() => unmount()).not.toThrow();
    });

    it('handles rapid mounting and unmounting', () => {
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<CalendarLoading />);
        expect(screen.getByText('Loading schedule...')).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('CSS Animation', () => {
    it('applies correct animation classes', () => {
      const { container } = render(<CalendarLoading />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('maintains spinner dimensions', () => {
      const { container } = render(<CalendarLoading />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('applies proper border styling for spinner', () => {
      const { container } = render(<CalendarLoading />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('rounded-full', 'border-b-2');
    });
  });
});
