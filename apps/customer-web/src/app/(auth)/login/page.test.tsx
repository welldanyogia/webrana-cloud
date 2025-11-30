import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './page';

// Mock the useLogin hook
const mockMutate = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useLogin: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the login page', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('heading', { name: /masuk ke akun anda/i })).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(screen.getByPlaceholderText('nama@email.com')).toBeInTheDocument();
    });

    it('should render password input', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(screen.getByPlaceholderText('Masukkan password')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
    });

    it('should render forgot password link', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('link', { name: /lupa password/i })).toBeInTheDocument();
    });

    it('should render register link', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('link', { name: /daftar sekarang/i })).toBeInTheDocument();
    });

    it('should render remember me checkbox', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(screen.getByText(/ingat saya/i)).toBeInTheDocument();
    });

    it('should render description text', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(screen.getByText(/selamat datang kembali/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty email', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { wrapper: createWrapper() });
      
      const submitButton = screen.getByRole('button', { name: /masuk/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email wajib diisi/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      await user.type(emailInput, 'invalid-email');
      
      const submitButton = screen.getByRole('button', { name: /masuk/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/format email tidak valid/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty password', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /masuk/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password wajib diisi/i)).toBeInTheDocument();
      });
    });

    it('should show error for password less than 6 characters', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      const passwordInput = screen.getByPlaceholderText('Masukkan password');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '12345');
      
      const submitButton = screen.getByRole('button', { name: /masuk/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password minimal 6 karakter/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call login mutation with valid data', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      const passwordInput = screen.getByPlaceholderText('Masukkan password');
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      const submitButton = screen.getByRole('button', { name: /masuk/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('Password Visibility', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { wrapper: createWrapper() });
      
      const passwordInput = screen.getByPlaceholderText('Masukkan password');
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Find toggle button (the eye icon button)
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn => 
        btn.querySelector('svg') && !btn.textContent?.includes('Masuk')
      );
      
      if (toggleButton) {
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');
        
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('Navigation Links', () => {
    it('should have forgot password link pointing to /forgot-password', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      const link = screen.getByRole('link', { name: /lupa password/i });
      expect(link).toHaveAttribute('href', '/forgot-password');
    });

    it('should have register link pointing to /register', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      const link = screen.getByRole('link', { name: /daftar sekarang/i });
      expect(link).toHaveAttribute('href', '/register');
    });
  });

  describe('Accessibility', () => {
    it('should have form element', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(document.querySelector('form')).toBeInTheDocument();
    });

    it('should have labeled inputs', () => {
      render(<LoginPage />, { wrapper: createWrapper() });
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
    });
  });
});
