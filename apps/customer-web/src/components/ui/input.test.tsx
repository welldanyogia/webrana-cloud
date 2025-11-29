import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(<Input label="Email" id="email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render required indicator when required', () => {
      render(<Input label="Required Field" required />);
      const asterisk = screen.getByText('*');
      expect(asterisk).toBeInTheDocument();
      expect(asterisk).toHaveClass('text-[var(--error)]');
    });
  });

  describe('Value Handling', () => {
    it('should handle onChange', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'test value' } });
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('should display value', () => {
      render(<Input defaultValue="default text" />);
      expect(screen.getByRole('textbox')).toHaveValue('default text');
    });

    it('should update with controlled value', () => {
      const { rerender } = render(<Input value="initial" readOnly />);
      expect(screen.getByRole('textbox')).toHaveValue('initial');
      
      rerender(<Input value="updated" readOnly />);
      expect(screen.getByRole('textbox')).toHaveValue('updated');
    });
  });

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('should render password input', () => {
      render(<Input type="password" />);
      // Password inputs don't have textbox role
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });
  });

  describe('Error State', () => {
    it('should display error message', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have error styling', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-[var(--error)]');
    });

    it('should have aria-invalid when error', () => {
      render(<Input error="Error message" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should have role alert for error message', () => {
      render(<Input error="Error message" id="test-input" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should display helper text', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('should not display helper text when there is an error', () => {
      render(<Input helperText="Helper text" error="Error text" />);
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
      expect(screen.getByText('Error text')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should have disabled styling', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:opacity-60');
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      const LeftIcon = () => <span data-testid="left-icon">📧</span>;
      render(<Input leftIcon={<LeftIcon />} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      const RightIcon = () => <span data-testid="right-icon">✓</span>;
      render(<Input rightIcon={<RightIcon />} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should have padding adjustment for left icon', () => {
      const LeftIcon = () => <span>📧</span>;
      render(<Input leftIcon={<LeftIcon />} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-11');
    });

    it('should have padding adjustment for right icon', () => {
      const RightIcon = () => <span>✓</span>;
      render(<Input rightIcon={<RightIcon />} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pr-11');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Input className="custom-class" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-describedby for error', () => {
      render(<Input id="test" error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('should have aria-describedby for helper text', () => {
      render(<Input id="test" helperText="Helper text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-helper');
    });
  });

  describe('Ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });
  });
});
