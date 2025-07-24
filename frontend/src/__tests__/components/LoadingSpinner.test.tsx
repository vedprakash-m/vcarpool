/**
 * Tests for LoadingSpinner Component
 * Testing all props, size variations, colors, and accessibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Default Behavior', () => {
    it('should render with default props', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('flex flex-col items-center justify-center');
    });

    it('should render spinner element with default size and color', () => {
      const { container } = render(<LoadingSpinner />);

      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toBeInTheDocument();
      expect(spinnerElement).toHaveClass('h-8 w-8'); // default md size
      expect(spinnerElement).toHaveClass('border-primary-600'); // default primary color
    });

    it('should not render text when no text prop provided', () => {
      render(<LoadingSpinner />);

      const text = screen.queryByText(/loading/i);
      expect(text).not.toBeInTheDocument();
    });
  });

  describe('Size Variations', () => {
    it('should render small size correctly', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toHaveClass('h-4 w-4');
    });

    it('should render medium size correctly', () => {
      const { container } = render(<LoadingSpinner size="md" />);

      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toHaveClass('h-8 w-8');
    });

    it('should render large size correctly', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toHaveClass('h-12 w-12');
    });

    it('should render extra large size correctly', () => {
      const { container } = render(<LoadingSpinner size="xl" />);

      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toHaveClass('h-16 w-16');
    });
  });

  describe('Color Variations', () => {
    it('should render primary color correctly', () => {
      const { container } = render(<LoadingSpinner color="primary" />);

      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toHaveClass('border-primary-600');
    });

    it('should render white color correctly', () => {
      const { container } = render(<LoadingSpinner color="white" />);

      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toHaveClass('border-white');
    });

    it('should render gray color correctly', () => {
      const { container } = render(<LoadingSpinner color="gray" />);

      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toHaveClass('border-gray-600');
    });
  });

  describe('Text Display', () => {
    it('should render text when provided', () => {
      const testText = 'Loading data...';
      render(<LoadingSpinner text={testText} />);

      const textElement = screen.getByText(testText);
      expect(textElement).toBeInTheDocument();
      expect(textElement).toHaveClass('mt-3 text-sm text-gray-600');
    });

    it('should render custom loading message', () => {
      const customMessage = 'Please wait while we process your request';
      render(<LoadingSpinner text={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('should position text below spinner', () => {
      const { container } = render(<LoadingSpinner text="Loading..." />);

      const wrapper = container.firstChild as HTMLElement;
      const textElement = screen.getByText('Loading...');

      expect(wrapper).toHaveClass('flex-col'); // vertical layout
      expect(textElement).toHaveClass('mt-3'); // margin top spacing
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const customClass = 'my-custom-spinner bg-blue-500';
      const { container } = render(<LoadingSpinner className={customClass} />);

      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass(customClass);
    });

    it('should combine custom className with default classes', () => {
      const customClass = 'p-4 border';
      const { container } = render(<LoadingSpinner className={customClass} />);

      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toHaveClass('flex flex-col items-center justify-center');
      expect(spinner).toHaveClass(customClass);
    });
  });

  describe('Prop Combinations', () => {
    it('should handle all props together', () => {
      const props = {
        size: 'lg' as const,
        color: 'white' as const,
        text: 'Loading your trips...',
        className: 'bg-gray-800 p-6 rounded-lg',
      };

      const { container } = render(<LoadingSpinner {...props} />);

      const wrapper = container.firstChild as HTMLElement;
      const spinnerElement = container.querySelector("[class*='animate-spin']");
      const textElement = screen.getByText(props.text);

      // Check wrapper
      expect(wrapper).toHaveClass(props.className);
      expect(wrapper).toHaveClass('flex flex-col items-center justify-center');

      // Check spinner
      expect(spinnerElement).toHaveClass('h-12 w-12'); // lg size
      expect(spinnerElement).toHaveClass('border-white'); // white color

      // Check text
      expect(textElement).toBeInTheDocument();
    });

    it('should work with minimal props', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toBeInTheDocument();

      // Should have correct size
      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toHaveClass('h-4 w-4');
    });
  });

  describe('CSS Classes and Animation', () => {
    it('should have proper animation class', () => {
      const { container } = render(<LoadingSpinner />);

      const spinnerElement = container.querySelector("[class*='animate-spin']");
      expect(spinnerElement).toHaveClass('animate-spin');
      expect(spinnerElement).toHaveClass('rounded-full');
      expect(spinnerElement).toHaveClass('border-b-2');
    });

    it('should maintain consistent structure across all size/color combinations', () => {
      const combinations = [
        { size: 'sm' as const, color: 'primary' as const },
        { size: 'md' as const, color: 'white' as const },
        { size: 'lg' as const, color: 'gray' as const },
        { size: 'xl' as const, color: 'primary' as const },
      ];

      combinations.forEach(({ size, color }) => {
        const { container } = render(
          <LoadingSpinner size={size} color={color} />
        );

        const spinnerElement = container.querySelector(
          "[class*='animate-spin']"
        );
        expect(spinnerElement).toHaveClass('animate-spin');
        expect(spinnerElement).toHaveClass('rounded-full');
        expect(spinnerElement).toHaveClass('border-b-2');
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide proper component structure', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.firstChild as HTMLElement;
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('flex');
    });

    it('should have screen reader accessible text when provided', () => {
      const loadingText = 'Loading user data';
      render(<LoadingSpinner text={loadingText} />);

      const textElement = screen.getByText(loadingText);
      expect(textElement).toBeInTheDocument();
      expect(textElement.tagName).toBe('P');
    });

    it('should be keyboard accessible (no focusable elements by design)', () => {
      const { container } = render(<LoadingSpinner />);

      // Loading spinners should not be focusable as they are status indicators
      const focusableElements = container.querySelectorAll(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      expect(focusableElements).toHaveLength(0);
    });
  });
});
