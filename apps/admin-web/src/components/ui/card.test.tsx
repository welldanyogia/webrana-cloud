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
  describe('Rendering', () => {
    it('should render children', () => {
      render(<Card>Card content</Card>);
      
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should have default styling', () => {
      render(<Card data-testid="card">Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('shadow');
    });
  });

  describe('Padding variants', () => {
    it('should have no padding by default', () => {
      render(<Card data-testid="card" padding="none">Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('p-4');
      expect(card).not.toHaveClass('p-5');
      expect(card).not.toHaveClass('p-6');
    });

    it('should apply small padding', () => {
      render(<Card data-testid="card" padding="sm">Content</Card>);
      
      expect(screen.getByTestId('card')).toHaveClass('p-4');
    });

    it('should apply medium padding', () => {
      render(<Card data-testid="card" padding="md">Content</Card>);
      
      expect(screen.getByTestId('card')).toHaveClass('p-5');
    });

    it('should apply large padding', () => {
      render(<Card data-testid="card" padding="lg">Content</Card>);
      
      expect(screen.getByTestId('card')).toHaveClass('p-6');
    });
  });

  describe('Hover variant', () => {
    it('should apply hover styles when hover is true', () => {
      render(<Card data-testid="card" hover>Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('cursor-pointer');
      expect(card).toHaveClass('hover:border-primary/50');
    });

    it('should not have hover styles by default', () => {
      render(<Card data-testid="card">Content</Card>);
      
      expect(screen.getByTestId('card')).not.toHaveClass('cursor-pointer');
    });
  });

  describe('Highlighted variant', () => {
    it('should apply highlighted styles when highlighted is true', () => {
      render(<Card data-testid="card" highlighted>Content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-primary/50');
      expect(card).toHaveClass('bg-primary/5');
    });
  });

  describe('Glow variant', () => {
    it('should apply glow styles when glow is true', () => {
      render(<Card data-testid="card" glow>Content</Card>);
      
      expect(screen.getByTestId('card')).toHaveClass('hover:shadow-[var(--glow-primary)]');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Card data-testid="card" className="custom-class">Content</Card>);
      
      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });
  });
});

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader>Header content</CardHeader>);
    
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('should have default border', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    
    expect(screen.getByTestId('header')).toHaveClass('border-b');
  });

  it('should not have border when noBorder is true', () => {
    render(<CardHeader data-testid="header" noBorder>Header</CardHeader>);
    
    expect(screen.getByTestId('header')).not.toHaveClass('border-b');
  });

  it('should have padding', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    
    const header = screen.getByTestId('header');
    expect(header).toHaveClass('px-6');
    expect(header).toHaveClass('py-4');
  });
});

describe('CardTitle', () => {
  it('should render as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    
    expect(screen.getByRole('heading', { level: 3, name: 'Title' })).toBeInTheDocument();
  });

  it('should have default medium size', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    
    expect(screen.getByTestId('title')).toHaveClass('text-lg');
  });

  it('should apply small size', () => {
    render(<CardTitle data-testid="title" size="sm">Title</CardTitle>);
    
    expect(screen.getByTestId('title')).toHaveClass('text-base');
  });

  it('should apply large size', () => {
    render(<CardTitle data-testid="title" size="lg">Title</CardTitle>);
    
    expect(screen.getByTestId('title')).toHaveClass('text-xl');
  });

  it('should have font-semibold', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    
    expect(screen.getByTestId('title')).toHaveClass('font-semibold');
  });
});

describe('CardDescription', () => {
  it('should render as p element', () => {
    render(<CardDescription>Description text</CardDescription>);
    
    expect(screen.getByText('Description text').tagName).toBe('P');
  });

  it('should have muted text color', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>);
    
    expect(screen.getByTestId('desc')).toHaveClass('text-muted-foreground');
  });

  it('should have small text', () => {
    render(<CardDescription data-testid="desc">Description</CardDescription>);
    
    expect(screen.getByTestId('desc')).toHaveClass('text-sm');
  });
});

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent>Content here</CardContent>);
    
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('should have padding by default', () => {
    render(<CardContent data-testid="content">Content</CardContent>);
    
    const content = screen.getByTestId('content');
    expect(content).toHaveClass('px-6');
    expect(content).toHaveClass('py-5');
  });

  it('should have no padding when noPadding is true', () => {
    render(<CardContent data-testid="content" noPadding>Content</CardContent>);
    
    const content = screen.getByTestId('content');
    expect(content).not.toHaveClass('px-6');
    expect(content).not.toHaveClass('py-5');
  });
});

describe('CardFooter', () => {
  it('should render children', () => {
    render(<CardFooter>Footer content</CardFooter>);
    
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should have border-t', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    
    expect(screen.getByTestId('footer')).toHaveClass('border-t');
  });

  it('should align start by default', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    
    expect(screen.getByTestId('footer')).toHaveClass('justify-start');
  });

  it('should align center', () => {
    render(<CardFooter data-testid="footer" align="center">Footer</CardFooter>);
    
    expect(screen.getByTestId('footer')).toHaveClass('justify-center');
  });

  it('should align end', () => {
    render(<CardFooter data-testid="footer" align="end">Footer</CardFooter>);
    
    expect(screen.getByTestId('footer')).toHaveClass('justify-end');
  });

  it('should align between', () => {
    render(<CardFooter data-testid="footer" align="between">Footer</CardFooter>);
    
    expect(screen.getByTestId('footer')).toHaveClass('justify-between');
  });
});

describe('Card Composition', () => {
  it('should compose card with header, content, and footer', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Card Title' })).toBeInTheDocument();
    expect(screen.getByText('Card description text')).toBeInTheDocument();
    expect(screen.getByText('Main content goes here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
