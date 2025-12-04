import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

describe('Tabs', () => {
  const TestTabs = ({ 
    defaultValue = 'tab1', 
    onValueChange 
  }: { 
    defaultValue?: string; 
    onValueChange?: (value: string) => void; 
  }) => (
    <Tabs value={defaultValue} onValueChange={onValueChange || vi.fn()}>
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content for Tab 1</TabsContent>
      <TabsContent value="tab2">Content for Tab 2</TabsContent>
      <TabsContent value="tab3">Content for Tab 3</TabsContent>
    </Tabs>
  );

  describe('Rendering', () => {
    it('should render tabs component', () => {
      render(<TestTabs />);
      expect(screen.getByRole('button', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tab 3' })).toBeInTheDocument();
    });

    it('should render the default tab content', () => {
      render(<TestTabs defaultValue="tab1" />);
      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument();
    });

    it('should not render other tab contents when not selected', () => {
      render(<TestTabs defaultValue="tab1" />);
      expect(screen.queryByText('Content for Tab 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content for Tab 3')).not.toBeInTheDocument();
    });
  });

  describe('Tab Selection', () => {
    it('should call onValueChange when tab is clicked', () => {
      const onValueChange = vi.fn();
      render(<TestTabs onValueChange={onValueChange} defaultValue="tab1" />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Tab 2' }));
      expect(onValueChange).toHaveBeenCalledWith('tab2');
    });

    it('should show corresponding content when tab is selected', () => {
      const ControlledTabs = () => {
        const [value, setValue] = vi.fn().mockImplementation((v) => v)();
        return <TestTabs defaultValue={value || 'tab1'} onValueChange={setValue} />;
      };
      
      // Use a simple test with state
      const { rerender } = render(<TestTabs defaultValue="tab1" />);
      expect(screen.getByText('Content for Tab 1')).toBeInTheDocument();
      
      rerender(<TestTabs defaultValue="tab2" />);
      expect(screen.getByText('Content for Tab 2')).toBeInTheDocument();
      expect(screen.queryByText('Content for Tab 1')).not.toBeInTheDocument();
    });
  });

  describe('TabsList', () => {
    it('should render with correct base classes', () => {
      render(<TestTabs />);
      const tabsList = screen.getByRole('button', { name: 'Tab 1' }).parentElement;
      expect(tabsList).toHaveClass('inline-flex');
      expect(tabsList).toHaveClass('items-center');
    });

    it('should apply custom className', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList className="custom-class">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      const tabsList = screen.getByRole('button', { name: 'Tab 1' }).parentElement;
      expect(tabsList).toHaveClass('custom-class');
    });
  });

  describe('TabsTrigger', () => {
    it('should have active styles when selected', () => {
      render(<TestTabs defaultValue="tab1" />);
      const activeTab = screen.getByRole('button', { name: 'Tab 1' });
      expect(activeTab).toHaveClass('bg-background');
      expect(activeTab).toHaveClass('shadow-sm');
    });

    it('should not have active styles when not selected', () => {
      render(<TestTabs defaultValue="tab1" />);
      const inactiveTab = screen.getByRole('button', { name: 'Tab 2' });
      expect(inactiveTab).not.toHaveClass('shadow-sm');
    });

    it('should support disabled state', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const disabledTab = screen.getByRole('button', { name: 'Tab 2' });
      expect(disabledTab).toBeDisabled();
    });

    it('should apply custom className', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">Tab 1</TabsTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tab = screen.getByRole('button', { name: 'Tab 1' });
      expect(tab).toHaveClass('custom-trigger');
    });
  });

  describe('TabsContent', () => {
    it('should only render when value matches', () => {
      render(<TestTabs defaultValue="tab2" />);
      expect(screen.queryByText('Content for Tab 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content for Tab 2')).toBeInTheDocument();
      expect(screen.queryByText('Content for Tab 3')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Tabs value="tab1" onValueChange={vi.fn()}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">Content</TabsContent>
        </Tabs>
      );
      
      const content = screen.getByText('Content');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('Accessibility', () => {
    it('should have button role for triggers', () => {
      render(<TestTabs />);
      const triggers = screen.getAllByRole('button');
      expect(triggers).toHaveLength(3);
    });

    it('should support keyboard navigation', () => {
      const onValueChange = vi.fn();
      render(<TestTabs onValueChange={onValueChange} />);
      
      const tab = screen.getByRole('button', { name: 'Tab 1' });
      tab.focus();
      
      // Tab triggers should be focusable
      expect(document.activeElement).toBe(tab);
    });
  });
});
