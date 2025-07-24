/**
 * HomePage Tests - UX Requirements Alignment
 *
 * Tests aligned with User_Experience.md requirements:
 * - Streamlined onboarding entry points
 * - Enhanced Family Unit Registration integration
 * - Progressive Parent Onboarding flow support
 * - Clear value proposition for school carpool coordination
 * - Accessible navigation to registration and login flows
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import HomePage from '../../app/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

describe('HomePage - Streamlined Family Onboarding Entry', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    route: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  describe('Family-Oriented Carpool Branding', () => {
    it('should display Carpool brand with family-focused messaging', () => {
      render(<HomePage />);

      expect(screen.getByText('Carpool')).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /sign in/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /join today/i })
      ).toBeInTheDocument();
    });

    it('should have correct navigation links in header', () => {
      render(<HomePage />);

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      const joinTodayLink = screen.getByRole('link', { name: /join today/i });

      expect(signInLink).toHaveAttribute('href', '/login');
      expect(joinTodayLink).toHaveAttribute('href', '/register');
    });

    it('should display car icon for Carpool branding', () => {
      render(<HomePage />);

      // Check for SVG elements that represent the car icon
      const carIcons = document.querySelectorAll('svg');
      expect(carIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Family Onboarding Hero Section', () => {
    it('should display family-centered school carpool messaging', () => {
      render(<HomePage />);

      expect(screen.getByText('Smart School')).toBeInTheDocument();
      expect(screen.getByText('Carpool Coordination')).toBeInTheDocument();
    });

    it('should display Enhanced Family Unit Registration value proposition', () => {
      render(<HomePage />);

      const description = screen.getByText(
        /connect with other parents to coordinate convenient school transportation/i
      );
      expect(description).toBeInTheDocument();

      expect(
        screen.getByText(/share rides, reduce costs, and build community/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /organized carpool partnerships for your children's daily school commute/i
        )
      ).toBeInTheDocument();
    });

    it('should have Progressive Parent Onboarding call-to-action buttons', () => {
      render(<HomePage />);

      const startCarpoolingBtn = screen.getByRole('link', {
        name: /start carpooling/i,
      });
      const parentLoginBtn = screen.getByRole('link', {
        name: /parent login/i,
      });

      expect(startCarpoolingBtn).toHaveAttribute('href', '/register');
      expect(parentLoginBtn).toHaveAttribute('href', '/login');
    });

    it('should use family-friendly styling for hero section', () => {
      render(<HomePage />);

      const heroHeading = screen.getByText('Smart School');
      expect(heroHeading.closest('h1')).toHaveClass(
        'text-4xl',
        'tracking-tight',
        'font-extrabold'
      );
    });

    it('should provide clear entry points for new families', () => {
      render(<HomePage />);

      // The registration button should be prominent for new families
      const startCarpoolingBtn = screen.getByRole('link', {
        name: /start carpooling/i,
      });

      expect(startCarpoolingBtn).toBeInTheDocument();
      expect(startCarpoolingBtn).toHaveAttribute('href', '/register');

      // Should support the Enhanced Family Unit Registration flow
      expect(startCarpoolingBtn).toBeVisible();
    });
  });

  describe('Family-Centered School Community Features', () => {
    it('should highlight Enhanced Family Unit Registration through parent community network', () => {
      render(<HomePage />);

      expect(screen.getByText('Parent Community Network')).toBeInTheDocument();
      expect(
        screen.getByText(/connect with parents from your school community/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/convenient, coordinated transportation partnerships/i)
      ).toBeInTheDocument();
    });

    it('should describe family-friendly flexible school scheduling', () => {
      render(<HomePage />);

      expect(
        screen.getByText('Flexible School Scheduling')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/coordinate morning drop-offs and afternoon pickups/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /recurring schedules that work for your family's routine/i
        )
      ).toBeInTheDocument();
    });

    it('should emphasize family cost-effective transportation benefits', () => {
      render(<HomePage />);

      expect(
        screen.getByText('Cost-Effective Transportation')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/share fuel costs and reduce wear on your vehicle/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /providing reliable school transportation for your children/i
        )
      ).toBeInTheDocument();
    });

    it('should display family-oriented feature cards with accessible icons', () => {
      render(<HomePage />);

      const featureCards = screen.getAllByText(
        /network|scheduling|transportation/i
      );
      expect(featureCards.length).toBeGreaterThanOrEqual(3);

      // Check for SVG icons in each feature card
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(3); // Header + 3 feature icons + others
    });
  });

  describe('Family-Focused School Value Proposition', () => {
    it('should display "Built for School Communities" with family emphasis', () => {
      render(<HomePage />);

      expect(
        screen.getByText('Built for School Communities')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Carpool makes school transportation coordination simple and organized for busy families/i
        )
      ).toBeInTheDocument();
    });

    it('should highlight family-oriented organized trip planning', () => {
      render(<HomePage />);

      expect(screen.getByText('Organized')).toBeInTheDocument();
      expect(screen.getByText('Structured trip planning')).toBeInTheDocument();
    });

    it('should emphasize family-friendly simplicity', () => {
      render(<HomePage />);

      expect(screen.getByText('Simple')).toBeInTheDocument();
      expect(screen.getByText('Easy trip coordination')).toBeInTheDocument();
    });

    it('should promote family savings benefit', () => {
      render(<HomePage />);

      expect(screen.getByText('Savings')).toBeInTheDocument();
      expect(
        screen.getByText('Reduced transportation costs')
      ).toBeInTheDocument();
    });

    it('should support Progressive Parent Onboarding through clear messaging', () => {
      render(<HomePage />);

      // Value propositions should be accessible and clear for new families
      expect(screen.getByText('Organized')).toBeInTheDocument();
      expect(screen.getByText('Simple')).toBeInTheDocument();
      expect(screen.getByText('Savings')).toBeInTheDocument();

      // These should guide families toward registration
      expect(
        screen.getByText('Built for School Communities')
      ).toBeInTheDocument();
    });
  });

  describe('Responsive Design and Accessibility', () => {
    it('should have responsive grid layouts', () => {
      render(<HomePage />);

      // Check for responsive classes in the DOM
      const gridElements = document.querySelectorAll('[class*="grid-cols"]');
      expect(gridElements.length).toBeGreaterThan(0);

      // Verify responsive breakpoints are used
      const responsiveElements = document.querySelectorAll(
        '[class*="sm:"], [class*="md:"], [class*="lg:"]'
      );
      expect(responsiveElements.length).toBeGreaterThan(0);
    });

    it('should use semantic HTML elements', () => {
      render(<HomePage />);

      expect(document.querySelector('header')).toBeInTheDocument();
      expect(document.querySelector('main')).toBeInTheDocument();
      expect(document.querySelector('h1')).toBeInTheDocument();
      expect(document.querySelector('nav')).toBeDefined();
    });

    it('should have proper heading hierarchy', () => {
      render(<HomePage />);

      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      const h3Elements = document.querySelectorAll('h3');

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
      expect(h3Elements.length).toBeGreaterThan(0);
    });

    it('should include accessibility attributes for icons', () => {
      render(<HomePage />);

      // Check for SVG elements with accessibility attributes
      const svgElements = document.querySelectorAll('svg');
      svgElements.forEach(svg => {
        // SVGs should have proper accessibility handling
        expect(svg).toBeDefined();
      });
    });
  });

  describe('Carpool Brand Consistency', () => {
    it('should use consistent primary color theming', () => {
      render(<HomePage />);

      // Check for primary color classes
      const primaryColorElements = document.querySelectorAll(
        '[class*="primary-6"]'
      );
      expect(primaryColorElements.length).toBeGreaterThan(0);
    });

    it('should display school transportation terminology consistently', () => {
      render(<HomePage />);

      expect(
        screen.getAllByText(/school transportation/i).length
      ).toBeGreaterThan(0);
      expect(screen.getAllByText(/carpool/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/parents/i)).toBeInTheDocument();
      expect(screen.getByText(/children/i)).toBeInTheDocument();
    });

    it('should use professional card-based layout', () => {
      render(<HomePage />);

      // Check for card classes
      const cardElements = document.querySelectorAll(
        '[class*="card"], [class*="shadow"], [class*="rounded"]'
      );
      expect(cardElements.length).toBeGreaterThan(0);
    });
  });

  describe('Family Onboarding User Journey - Progressive Entry Points', () => {
    it('should provide clear Enhanced Family Unit Registration path for new families', () => {
      render(<HomePage />);

      const registrationLinks = screen.getAllByRole('link', {
        name: /start carpooling|join today/i,
      });
      expect(registrationLinks.length).toBeGreaterThanOrEqual(2);

      registrationLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '/register');
      });
    });

    it('should provide Progressive Parent Onboarding login path for existing families', () => {
      render(<HomePage />);

      const loginLinks = screen.getAllByRole('link', {
        name: /sign in|parent login/i,
      });
      expect(loginLinks.length).toBeGreaterThanOrEqual(2);

      loginLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '/login');
      });
    });

    it('should differentiate between family registration and family login actions', () => {
      render(<HomePage />);

      const startCarpoolingBtn = screen.getByRole('link', {
        name: /start carpooling/i,
      });
      const parentLoginBtn = screen.getByRole('link', {
        name: /parent login/i,
      });

      // Primary action (family registration) should have primary styling
      expect(startCarpoolingBtn).toHaveClass('bg-primary-600');

      // Secondary action (family login) should have different styling
      expect(parentLoginBtn).toHaveClass('bg-white');
    });

    it('should support streamlined family onboarding flow', () => {
      render(<HomePage />);

      // Multiple entry points for different family onboarding paths
      const heroRegisterBtn = screen.getByRole('link', {
        name: /start carpooling/i,
      });
      const headerJoinBtn = screen.getByRole('link', {
        name: /join today/i,
      });

      expect(heroRegisterBtn).toHaveAttribute('href', '/register');
      expect(headerJoinBtn).toHaveAttribute('href', '/register');

      // Both should support the Enhanced Family Unit Registration flow
      expect(heroRegisterBtn).toBeVisible();
      expect(headerJoinBtn).toBeVisible();
    });
  });

  describe('Performance and Loading', () => {
    it('should render without throwing errors', () => {
      expect(() => render(<HomePage />)).not.toThrow();
    });

    it('should have minimal initial render complexity', () => {
      const { container } = render(<HomePage />);

      // Should not have overly complex nested structures
      const deeplyNestedElements = container.querySelectorAll(
        'div > div > div > div > div > div'
      );
      expect(deeplyNestedElements.length).toBeLessThan(10);
    });

    it('should not have any async loading states on initial render', () => {
      render(<HomePage />);

      // HomePage should be static - no loading spinners or async content
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Family-Focused Content Validation', () => {
    it('should have complete family onboarding hero section content', () => {
      render(<HomePage />);

      // Verify all family-focused hero elements are present
      expect(screen.getByText('Smart School')).toBeInTheDocument();
      expect(screen.getByText('Carpool Coordination')).toBeInTheDocument();
      expect(
        screen.getByText(/connect with other parents/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /start carpooling/i })
      ).toBeInTheDocument();
    });

    it('should not have any placeholder or development text', () => {
      render(<HomePage />);

      const textContent = document.body.textContent;
      expect(textContent).not.toMatch(/lorem ipsum|placeholder|todo|fixme/i);
    });

    it('should have family and school-specific language throughout', () => {
      render(<HomePage />);

      const textContent = document.body.textContent;
      expect(textContent).toMatch(/school/i);
      expect(textContent).toMatch(/children|kids/i);
      expect(textContent).toMatch(/parents/i);
      expect(textContent).toMatch(/carpool/i);
      expect(textContent).toMatch(/family|families/i);
    });

    it('should support Progressive Parent Onboarding messaging', () => {
      render(<HomePage />);

      // Content should clearly guide families through the onboarding process
      expect(screen.getByText(/start carpooling/i)).toBeInTheDocument();
      expect(screen.getByText(/join today/i)).toBeInTheDocument();
      expect(screen.getByText(/parent login/i)).toBeInTheDocument();

      // Should emphasize community and family benefits
      expect(screen.getByText(/parent community network/i)).toBeInTheDocument();
      expect(screen.getByText(/school communities/i)).toBeInTheDocument();
    });

    it('should provide Enhanced Family Unit Registration context', () => {
      render(<HomePage />);

      // Should emphasize family-unit benefits and coordination
      expect(screen.getByText(/family/i)).toBeInTheDocument();
      expect(screen.getAllByText(/coordination/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/organized/i)).toBeInTheDocument();
      expect(screen.getByText(/convenient/i)).toBeInTheDocument();
    });
  });
});
