import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

describe('Card', () => {
  describe('Card Component', () => {
    it('should render children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should have default styling', () => {
      render(<Card>Content</Card>);
      const card = screen.getByText('Content').parentElement || screen.getByText('Content');
      expect(card).toHaveClass('bg-[var(--card-bg)]');
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('border');
    });

    it('should apply hover effects when hover prop is true', () => {
      render(<Card hover>Hover Card</Card>);
      const card = screen.getByText('Hover Card').parentElement || screen.getByText('Hover Card');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should apply highlighted styling', () => {
      render(<Card highlighted>Highlighted Card</Card>);
      const card = screen.getByText('Highlighted Card').parentElement || screen.getByText('Highlighted Card');
      expect(card).toHaveClass('border-[var(--primary)]/50');
    });

    it('should apply glow effect', () => {
      render(<Card glow>Glow Card</Card>);
      const card = screen.getByText('Glow Card').parentElement || screen.getByText('Glow Card');
      expect(card).toHaveClass('hover:shadow-[var(--glow-primary)]');
    });

    describe('Padding', () => {
      it('should have no padding by default', () => {
        render(<Card>No Padding</Card>);
        const card = screen.getByText('No Padding').parentElement || screen.getByText('No Padding');
        expect(card).not.toHaveClass('p-4', 'p-5', 'p-6');
      });

      it('should apply sm padding', () => {
        render(<Card padding="sm">Small Padding</Card>);
        const card = screen.getByText('Small Padding').parentElement || screen.getByText('Small Padding');
        expect(card).toHaveClass('p-4');
      });

      it('should apply md padding', () => {
        render(<Card padding="md">Medium Padding</Card>);
        const card = screen.getByText('Medium Padding').parentElement || screen.getByText('Medium Padding');
        expect(card).toHaveClass('p-5');
      });

      it('should apply lg padding', () => {
        render(<Card padding="lg">Large Padding</Card>);
        const card = screen.getByText('Large Padding').parentElement || screen.getByText('Large Padding');
        expect(card).toHaveClass('p-6');
      });
    });

    it('should apply custom className', () => {
      render(<Card className="custom-card">Custom</Card>);
      const card = screen.getByText('Custom').parentElement || screen.getByText('Custom');
      expect(card).toHaveClass('custom-card');
    });
  });

  describe('CardHeader Component', () => {
    it('should render children', () => {
      render(<CardHeader>Header Content</CardHeader>);
      expect(screen.getByText('Header Content')).toBeInTheDocument();
    });

    it('should have default styling with border', () => {
      render(<CardHeader>Header</CardHeader>);
      const header = screen.getByText('Header').parentElement || screen.getByText('Header');
      expect(header).toHaveClass('px-6', 'py-4');
      expect(header).toHaveClass('border-b');
    });

    it('should remove border when noBorder is true', () => {
      render(<CardHeader noBorder>No Border Header</CardHeader>);
      const header = screen.getByText('No Border Header').parentElement || screen.getByText('No Border Header');
      expect(header).not.toHaveClass('border-b');
    });
  });

  describe('CardTitle Component', () => {
    it('should render children', () => {
      render(<CardTitle>Card Title</CardTitle>);
      expect(screen.getByRole('heading', { name: 'Card Title' })).toBeInTheDocument();
    });

    it('should render as h3', () => {
      render(<CardTitle>Title</CardTitle>);
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toBeInTheDocument();
    });

    describe('Sizes', () => {
      it('should apply sm size', () => {
        render(<CardTitle size="sm">Small Title</CardTitle>);
        const title = screen.getByRole('heading');
        expect(title).toHaveClass('text-base');
      });

      it('should apply md size (default)', () => {
        render(<CardTitle>Medium Title</CardTitle>);
        const title = screen.getByRole('heading');
        expect(title).toHaveClass('text-lg');
      });

      it('should apply lg size', () => {
        render(<CardTitle size="lg">Large Title</CardTitle>);
        const title = screen.getByRole('heading');
        expect(title).toHaveClass('text-xl');
      });
    });
  });

  describe('CardDescription Component', () => {
    it('should render children', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should have description styling', () => {
      render(<CardDescription>Description</CardDescription>);
      const description = screen.getByText('Description');
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveClass('text-[var(--text-secondary)]');
    });
  });

  describe('CardContent Component', () => {
    it('should render children', () => {
      render(<CardContent>Content</CardContent>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should have default padding', () => {
      render(<CardContent>Padded Content</CardContent>);
      const content = screen.getByText('Padded Content').parentElement || screen.getByText('Padded Content');
      expect(content).toHaveClass('px-6', 'py-5');
    });

    it('should remove padding when noPadding is true', () => {
      render(<CardContent noPadding>No Padding Content</CardContent>);
      const content = screen.getByText('No Padding Content').parentElement || screen.getByText('No Padding Content');
      expect(content).not.toHaveClass('px-6', 'py-5');
    });
  });

  describe('CardFooter Component', () => {
    it('should render children', () => {
      render(<CardFooter>Footer Content</CardFooter>);
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });

    it('should have footer styling', () => {
      render(<CardFooter>Footer</CardFooter>);
      const footer = screen.getByText('Footer').parentElement || screen.getByText('Footer');
      expect(footer).toHaveClass('px-6', 'py-4');
      expect(footer).toHaveClass('border-t');
    });

    describe('Alignment', () => {
      it('should align start by default', () => {
        render(<CardFooter>Start Aligned</CardFooter>);
        const footer = screen.getByText('Start Aligned').parentElement || screen.getByText('Start Aligned');
        expect(footer).toHaveClass('justify-start');
      });

      it('should align center', () => {
        render(<CardFooter align="center">Centered</CardFooter>);
        const footer = screen.getByText('Centered').parentElement || screen.getByText('Centered');
        expect(footer).toHaveClass('justify-center');
      });

      it('should align end', () => {
        render(<CardFooter align="end">End Aligned</CardFooter>);
        const footer = screen.getByText('End Aligned').parentElement || screen.getByText('End Aligned');
        expect(footer).toHaveClass('justify-end');
      });

      it('should align between', () => {
        render(<CardFooter align="between">Space Between</CardFooter>);
        const footer = screen.getByText('Space Between').parentElement || screen.getByText('Space Between');
        expect(footer).toHaveClass('justify-between');
      });
    });
  });

  describe('Composed Card', () => {
    it('should render a complete card with all subcomponents', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>This is a test card</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card body content</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByRole('heading', { name: 'Test Card' })).toBeInTheDocument();
      expect(screen.getByText('This is a test card')).toBeInTheDocument();
      expect(screen.getByText('Card body content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });
});
