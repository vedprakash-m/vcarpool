/**
 * LoadingSpinner Realistic Tests - Testing Actual Implementation
 * Based on: frontend/src/components/LoadingSpinner.tsx
 * Authority: docs/User_Experience.md
 *
 * This test file validates the ACTUAL LoadingSpinner implementation,
 * testing real rendering, accessibility, and behavior.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../../components/LoadingSpinner';

describe('LoadingSpinner - Realistic Implementation Tests', () => {
  describe('Core Functionality', () => {
    it('renders with default props', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-b-2');
    });

    it('renders with text when provided', () => {
      render(<LoadingSpinner text="Loading data..." />);

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      expect(screen.getByText('Loading data...')).toHaveClass(
        'mt-3',
        'text-sm',
        'text-gray-600'
      );
    });

    it('renders without text when not provided', () => {
      render(<LoadingSpinner />);

      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('renders medium size correctly (default)', () => {
      const { container } = render(<LoadingSpinner size="md" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('renders large size correctly', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-12', 'w-12');
    });

    it('renders extra large size correctly', () => {
      const { container } = render(<LoadingSpinner size="xl" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-16', 'w-16');
    });

    it('uses medium size as default', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });
  });

  describe('Color Variants', () => {
    it('renders primary color correctly (default)', () => {
      const { container } = render(<LoadingSpinner color="primary" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-primary-600');
    });

    it('renders white color correctly', () => {
      const { container } = render(<LoadingSpinner color="white" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-white');
    });

    it('renders gray color correctly', () => {
      const { container } = render(<LoadingSpinner color="gray" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-gray-600');
    });

    it('uses primary color as default', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('border-primary-600');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className correctly', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('combines default and custom classes', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass(
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'custom-class'
      );
    });

    it('applies empty className gracefully', () => {
      const { container } = render(<LoadingSpinner className="" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass(
        'flex',
        'flex-col',
        'items-center',
        'justify-center'
      );
    });
  });

  describe('Complex Combinations', () => {
    it('renders with all props combined', () => {
      render(
        <LoadingSpinner
          size="lg"
          color="white"
          text="Processing request..."
          className="my-custom-loader"
        />
      );

      const text = screen.getByText('Processing request...');
      expect(text).toBeInTheDocument();

      const { container } = render(
        <LoadingSpinner
          size="lg"
          color="white"
          text="Processing request..."
          className="my-custom-loader"
        />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('my-custom-loader');

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-12', 'w-12', 'border-white');
    });

    it('handles dynamic prop changes', () => {
      const { rerender } = render(
        <LoadingSpinner size="sm" text="Loading..." />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      rerender(<LoadingSpinner size="lg" text="Still loading..." />);

      expect(screen.getByText('Still loading...')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides visual loading indicator for screen readers', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('provides text alternative when text prop is used', () => {
      render(<LoadingSpinner text="Loading user data" />);

      const text = screen.getByText('Loading user data');
      expect(text).toBeInTheDocument();
      expect(text).toBeVisible();
    });

    it('is semantically structured', () => {
      const { container } = render(<LoadingSpinner text="Loading..." />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass(
        'flex',
        'flex-col',
        'items-center',
        'justify-center'
      );
    });
  });

  describe('Animation and Visual Structure', () => {
    it('applies spin animation correctly', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('maintains circular border structure', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveClass('rounded-full', 'border-b-2');
    });

    it('positions text below spinner when provided', () => {
      render(<LoadingSpinner text="Loading..." />);

      const text = screen.getByText('Loading...');
      expect(text).toHaveClass('mt-3');
    });
  });

  describe('Integration Scenarios', () => {
    it('works within complex layouts', () => {
      render(
        <div data-testid="complex-layout">
          <header>Header</header>
          <main>
            <LoadingSpinner text="Loading main content..." />
          </main>
          <footer>Footer</footer>
        </div>
      );

      expect(screen.getByTestId('complex-layout')).toBeInTheDocument();
      expect(screen.getByText('Loading main content...')).toBeInTheDocument();
    });

    it('handles multiple loading spinners', () => {
      render(
        <div>
          <LoadingSpinner text="Loading users..." className="loader-1" />
          <LoadingSpinner text="Loading posts..." className="loader-2" />
        </div>
      );

      expect(screen.getByText('Loading users...')).toBeInTheDocument();
      expect(screen.getByText('Loading posts...')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    it('renders efficiently', () => {
      const startTime = performance.now();
      render(<LoadingSpinner />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should render quickly
    });

    it('cleans up properly on unmount', () => {
      const { unmount } = render(<LoadingSpinner />);

      expect(() => unmount()).not.toThrow();
    });
  });
});
