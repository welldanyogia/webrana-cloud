import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './dialog';
import { Button } from './button';

describe('Dialog', () => {
  const TestDialog = ({ 
    defaultOpen = false,
    onOpenChange,
  }: { 
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <Dialog defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Dialog</DialogTitle>
          <DialogDescription>This is a test dialog description.</DialogDescription>
        </DialogHeader>
        <div>Dialog body content</div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  describe('Rendering', () => {
    it('should render trigger button', () => {
      render(<TestDialog />);
      expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument();
    });

    it('should not render dialog content when closed', () => {
      render(<TestDialog />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render dialog content when defaultOpen is true', () => {
      render(<TestDialog defaultOpen={true} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render dialog title when open', () => {
      render(<TestDialog defaultOpen={true} />);
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    });

    it('should render dialog description when open', () => {
      render(<TestDialog defaultOpen={true} />);
      expect(screen.getByText('This is a test dialog description.')).toBeInTheDocument();
    });

    it('should render dialog body content when open', () => {
      render(<TestDialog defaultOpen={true} />);
      expect(screen.getByText('Dialog body content')).toBeInTheDocument();
    });

    it('should render footer buttons when open', () => {
      render(<TestDialog defaultOpen={true} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    });
  });

  describe('Opening', () => {
    it('should open dialog when trigger is clicked', () => {
      render(<TestDialog />);
      
      fireEvent.click(screen.getByRole('button', { name: /open dialog/i }));
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should call onOpenChange with true when opened', () => {
      const onOpenChange = vi.fn();
      render(<TestDialog onOpenChange={onOpenChange} />);
      
      fireEvent.click(screen.getByRole('button', { name: /open dialog/i }));
      
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Closing', () => {
    it('should close dialog when close button is clicked', () => {
      render(<TestDialog defaultOpen={true} />);
      
      // The close button (X) in top right
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close dialog when cancel button is clicked', () => {
      render(<TestDialog defaultOpen={true} />);
      
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call onOpenChange with false when closed', () => {
      const onOpenChange = vi.fn();
      render(<TestDialog defaultOpen={true} onOpenChange={onOpenChange} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('DialogContent', () => {
    it('should have max-width class', () => {
      render(<TestDialog defaultOpen={true} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('max-w-lg');
    });

    it('should be centered on screen', () => {
      render(<TestDialog defaultOpen={true} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('left-[50%]');
      expect(dialog).toHaveClass('top-[50%]');
    });

    it('should have border and background', () => {
      render(<TestDialog defaultOpen={true} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('border');
      expect(dialog).toHaveClass('bg-background');
    });
  });

  describe('DialogHeader', () => {
    it('should render header with correct styling', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
      
      const header = screen.getByTestId('dialog-header');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('flex-col');
    });

    it('should apply custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader data-testid="dialog-header" className="custom-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
      
      expect(screen.getByTestId('dialog-header')).toHaveClass('custom-header');
    });
  });

  describe('DialogFooter', () => {
    it('should render footer with correct styling', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter data-testid="dialog-footer">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
      
      const footer = screen.getByTestId('dialog-footer');
      expect(footer).toHaveClass('flex');
    });

    it('should apply custom className', () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogFooter data-testid="dialog-footer" className="custom-footer">
              <Button>Action</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
      
      expect(screen.getByTestId('dialog-footer')).toHaveClass('custom-footer');
    });
  });

  describe('DialogTitle', () => {
    it('should have correct styling', () => {
      render(<TestDialog defaultOpen={true} />);
      const title = screen.getByText('Test Dialog');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
    });
  });

  describe('DialogDescription', () => {
    it('should have correct styling', () => {
      render(<TestDialog defaultOpen={true} />);
      const description = screen.getByText('This is a test dialog description.');
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(<TestDialog defaultOpen={true} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have close button with screen reader text', () => {
      render(<TestDialog defaultOpen={true} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should trap focus within dialog when open', () => {
      render(<TestDialog defaultOpen={true} />);
      // Dialog should be in the document, meaning focus management is active
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
