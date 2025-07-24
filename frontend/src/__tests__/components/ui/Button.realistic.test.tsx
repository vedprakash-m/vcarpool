import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../../../components/ui/button';

describe('Button - Realistic Implementation Tests', () => {
  describe('Core Functionality', () => {
    it('renders basic button with default props', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass(
        'inline-flex',
        'items-center',
        'justify-center'
      );
    });

    it('handles click events correctly', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button', { name: 'Click me' });
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('forwards ref correctly', () => {
      const buttonRef = React.createRef<HTMLButtonElement>();
      render(<Button ref={buttonRef}>Test</Button>);

      expect(buttonRef.current).toBeInstanceOf(HTMLButtonElement);
      expect(buttonRef.current?.textContent).toBe('Test');
    });

    it('applies custom className correctly', () => {
      render(<Button className="custom-class">Test</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Button Variants', () => {
    it('renders default variant correctly', () => {
      render(<Button variant="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('renders destructive variant correctly', () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'bg-destructive',
        'text-destructive-foreground'
      );
    });

    it('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-input');
    });

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent');
    });

    it('renders link variant correctly', () => {
      render(<Button variant="link">Link</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('underline-offset-4', 'hover:underline');
    });
  });

  describe('Button Sizes', () => {
    it('renders default size correctly', () => {
      render(<Button size="default">Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'py-2', 'px-4');
    });

    it('renders small size correctly', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-3');
    });

    it('renders large size correctly', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11', 'px-8');
    });

    it('renders icon size correctly', () => {
      render(<Button size="icon">🔍</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'w-10');
    });
  });

  describe('Button States', () => {
    it('handles disabled state correctly', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass(
        'disabled:opacity-50',
        'disabled:pointer-events-none'
      );
    });

    it('prevents click when disabled', () => {
      const handleClick = jest.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('applies focus styles correctly', () => {
      render(<Button>Focus Test</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'focus-visible:outline-none',
        'focus-visible:ring-2'
      );
    });
  });

  describe('HTML Attributes', () => {
    it('forwards HTML attributes correctly', () => {
      render(
        <Button
          type="submit"
          data-testid="submit-button"
          aria-label="Submit form"
        >
          Submit
        </Button>
      );

      const button = screen.getByTestId('submit-button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });

    it('handles form attribute correctly', () => {
      render(<Button form="test-form">External Form Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('form', 'test-form');
    });

    it('handles name and value attributes', () => {
      render(
        <Button name="action" value="save">
          Save
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('name', 'action');
      expect(button).toHaveAttribute('value', 'save');
    });
  });

  describe('Accessibility', () => {
    it('has proper accessibility role', () => {
      render(<Button>Accessible Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('supports aria attributes', () => {
      render(
        <Button
          aria-pressed="true"
          aria-expanded="false"
          aria-describedby="help-text"
        >
          Toggle
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('maintains keyboard navigation', () => {
      render(<Button>Keyboard Test</Button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });
  });

  describe('Complex Usage Scenarios', () => {
    it('handles complex children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toContainHTML('<span>Icon</span><span>Text</span>');
    });

    it('combines variant and size props correctly', () => {
      render(
        <Button variant="outline" size="lg">
          Large Outline
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-input'); // outline variant
      expect(button).toHaveClass('h-11', 'px-8'); // large size
    });

    it('handles multiple CSS classes correctly', () => {
      render(
        <Button
          variant="secondary"
          size="sm"
          className="extra-margin custom-border"
        >
          Complex Button
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary'); // variant
      expect(button).toHaveClass('h-9'); // size
      expect(button).toHaveClass('extra-margin', 'custom-border'); // custom
    });
  });

  describe('Integration Scenarios', () => {
    it('works within forms correctly', () => {
      const handleSubmit = jest.fn(e => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit Form</Button>
        </form>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('supports loading states pattern', () => {
      const LoadingButton = ({ isLoading }: { isLoading: boolean }) => (
        <Button disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Submit'}
        </Button>
      );

      const { rerender } = render(<LoadingButton isLoading={false} />);
      expect(screen.getByText('Submit')).toBeInTheDocument();

      rerender(<LoadingButton isLoading={true} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
});
