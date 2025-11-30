import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from './dropdown-menu';
import { Button } from './button';

describe('DropdownMenu', () => {
  const TestDropdownMenu = ({ 
    onSelect,
  }: { 
    onSelect?: () => void;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSelect}>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          Logout
          <DropdownMenuShortcut>⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  describe('Rendering', () => {
    it('should render trigger button', () => {
      render(<TestDropdownMenu />);
      expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
    });

    it('should not render menu content initially', () => {
      render(<TestDropdownMenu />);
      expect(screen.queryByText('My Account')).not.toBeInTheDocument();
    });
  });

  describe('Opening', () => {
    it('should open menu when trigger is clicked', async () => {
      render(<TestDropdownMenu />);
      
      fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
      
      // Wait for content to appear with a reasonable timeout
      await waitFor(() => {
        expect(screen.getByText('My Account')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should show menu items when open', async () => {
      render(<TestDropdownMenu />);
      
      fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('DropdownMenuShortcut', () => {
    it('should render shortcut component', () => {
      render(
        <div>
          <DropdownMenuShortcut>⌘Q</DropdownMenuShortcut>
        </div>
      );
      
      expect(screen.getByText('⌘Q')).toBeInTheDocument();
    });

    it('should have correct styling', () => {
      render(
        <div>
          <DropdownMenuShortcut>⌘Q</DropdownMenuShortcut>
        </div>
      );
      
      const shortcut = screen.getByText('⌘Q');
      expect(shortcut).toHaveClass('ml-auto');
      expect(shortcut).toHaveClass('text-xs');
    });
  });

  describe('DropdownMenuLabel', () => {
    it('should render label component', () => {
      // We test the component directly without the menu context
      const { container } = render(
        <DropdownMenuLabel>Account Label</DropdownMenuLabel>
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
