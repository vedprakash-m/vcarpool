import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../../components/ui/card';

describe('Card Components - Realistic Implementation Tests', () => {
  describe('Card - Base Component', () => {
    it('renders basic card with default props', () => {
      render(<Card data-testid="test-card">Card content</Card>);

      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
        'text-card-foreground',
        'shadow-sm'
      );
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Card ref={ref}>Card content</Card>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies custom className correctly', () => {
      render(
        <Card className="custom-card" data-testid="test-card">
          Card content
        </Card>
      );

      const card = screen.getByTestId('test-card');
      expect(card).toHaveClass('custom-card');
      expect(card).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
        'text-card-foreground',
        'shadow-sm'
      );
    });

    it('forwards HTML attributes correctly', () => {
      render(
        <Card data-testid="test-card" id="unique-card" role="region">
          Card content
        </Card>
      );

      const card = screen.getByTestId('test-card');
      expect(card).toHaveAttribute('id', 'unique-card');
      expect(card).toHaveAttribute('role', 'region');
    });
  });

  describe('CardHeader Component', () => {
    it('renders with default props', () => {
      render(<CardHeader data-testid="test-header">Header content</CardHeader>);

      const header = screen.getByTestId('test-header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardHeader ref={ref}>Header content</CardHeader>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies custom className correctly', () => {
      render(
        <CardHeader className="custom-header" data-testid="test-header">
          Header content
        </CardHeader>
      );

      const header = screen.getByTestId('test-header');
      expect(header).toHaveClass('custom-header');
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });
  });

  describe('CardTitle Component', () => {
    it('renders as h3 with default props', () => {
      render(<CardTitle>Test Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Title');
      expect(title).toHaveClass(
        'text-2xl',
        'font-semibold',
        'leading-none',
        'tracking-tight'
      );
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLHeadingElement>();
      render(<CardTitle ref={ref}>Title</CardTitle>);

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
      expect(ref.current?.tagName).toBe('H3');
    });

    it('applies custom className correctly', () => {
      render(<CardTitle className="custom-title">Test Title</CardTitle>);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('custom-title');
      expect(title).toHaveClass(
        'text-2xl',
        'font-semibold',
        'leading-none',
        'tracking-tight'
      );
    });

    it('forwards HTML attributes correctly', () => {
      render(
        <CardTitle id="unique-title" data-testid="test-title">
          Test Title
        </CardTitle>
      );

      const title = screen.getByTestId('test-title');
      expect(title).toHaveAttribute('id', 'unique-title');
    });
  });

  describe('CardDescription Component', () => {
    it('renders as paragraph with default props', () => {
      render(<CardDescription>Test description</CardDescription>);

      const description = screen.getByText('Test description');
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      render(<CardDescription ref={ref}>Description</CardDescription>);

      expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
    });

    it('applies custom className correctly', () => {
      render(
        <CardDescription className="custom-desc">
          Test description
        </CardDescription>
      );

      const description = screen.getByText('Test description');
      expect(description).toHaveClass('custom-desc');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });
  });

  describe('CardContent Component', () => {
    it('renders with default props', () => {
      render(
        <CardContent data-testid="test-content">Content area</CardContent>
      );

      const content = screen.getByTestId('test-content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardContent ref={ref}>Content</CardContent>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies custom className correctly', () => {
      render(
        <CardContent className="custom-content" data-testid="test-content">
          Content
        </CardContent>
      );

      const content = screen.getByTestId('test-content');
      expect(content).toHaveClass('custom-content');
      expect(content).toHaveClass('p-6', 'pt-0');
    });
  });

  describe('CardFooter Component', () => {
    it('renders with default props', () => {
      render(<CardFooter data-testid="test-footer">Footer content</CardFooter>);

      const footer = screen.getByTestId('test-footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<CardFooter ref={ref}>Footer</CardFooter>);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('applies custom className correctly', () => {
      render(
        <CardFooter className="custom-footer" data-testid="test-footer">
          Footer
        </CardFooter>
      );

      const footer = screen.getByTestId('test-footer');
      expect(footer).toHaveClass('custom-footer');
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });
  });

  describe('Complete Card Structure', () => {
    it('renders full card with all components', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is the main content area of the card.</p>
          </CardContent>
          <CardFooter>
            <button>Save Changes</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('complete-card')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        'User Profile'
      );
      expect(
        screen.getByText('Manage your account settings')
      ).toBeInTheDocument();
      expect(
        screen.getByText('This is the main content area of the card.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Save Changes' })
      ).toBeInTheDocument();
    });

    it('works with minimal structure', () => {
      render(
        <Card>
          <CardContent>
            <p>Simple card with just content</p>
          </CardContent>
        </Card>
      );

      expect(
        screen.getByText('Simple card with just content')
      ).toBeInTheDocument();
    });

    it('handles header-only card', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Header Only</CardTitle>
          </CardHeader>
        </Card>
      );

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        'Header Only'
      );
    });
  });

  describe('Accessibility', () => {
    it('maintains proper heading hierarchy', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Main Title</CardTitle>
            <CardDescription>Supporting description</CardDescription>
          </CardHeader>
        </Card>
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Main Title');
    });

    it('supports aria attributes', () => {
      render(
        <Card aria-label="User information card" role="region">
          <CardContent>User details here</CardContent>
        </Card>
      );

      const card = screen.getByRole('region');
      expect(card).toHaveAttribute('aria-label', 'User information card');
    });

    it('maintains semantic structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Article Title</CardTitle>
            <CardDescription>Article subtitle</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Article content</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByText('Article content')).toBeInTheDocument();
    });
  });

  describe('Complex Usage Scenarios', () => {
    it('handles nested interactive elements', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Interactive Card</CardTitle>
          </CardHeader>
          <CardContent>
            <input placeholder="Enter text" />
            <select>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </CardContent>
          <CardFooter>
            <button>Submit</button>
            <button>Cancel</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Submit' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Cancel' })
      ).toBeInTheDocument();
    });

    it('supports custom styling combinations', () => {
      render(
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-blue-900">Styled Card</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <p>Custom styled content</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Styled Card')).toHaveClass('text-blue-900');
      expect(screen.getByText('Custom styled content')).toBeInTheDocument();
    });

    it('handles dynamic content updates', () => {
      const DynamicCard = ({ title }: { title: string }) => (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        </Card>
      );

      const { rerender } = render(<DynamicCard title="Initial Title" />);
      expect(screen.getByText('Initial Title')).toBeInTheDocument();

      rerender(<DynamicCard title="Updated Title" />);
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
      expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    it('renders efficiently', () => {
      const startTime = performance.now();
      render(
        <Card>
          <CardHeader>
            <CardTitle>Performance Test</CardTitle>
          </CardHeader>
          <CardContent>Content for performance testing</CardContent>
        </Card>
      );
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });

    it('cleans up properly on unmount', () => {
      const { unmount } = render(
        <Card>
          <CardContent>Test content</CardContent>
        </Card>
      );

      expect(() => unmount()).not.toThrow();
    });

    it('handles multiple cards efficiently', () => {
      const cards = Array.from({ length: 10 }, (_, i) => (
        <Card key={i}>
          <CardTitle>Card {i + 1}</CardTitle>
        </Card>
      ));

      const { container } = render(<div>{cards}</div>);
      expect(container.querySelectorAll('[class*="rounded-lg"]')).toHaveLength(
        10
      );
    });
  });
});
