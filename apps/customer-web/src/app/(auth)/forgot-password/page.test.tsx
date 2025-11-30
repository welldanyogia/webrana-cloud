import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ForgotPasswordPage from './page';

// Mock the useForgotPassword hook
const mockMutate = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useForgotPassword: () => ({
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

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State Rendering', () => {
    it('should render the forgot password page', () => {
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('heading', { name: /lupa password/i })).toBeInTheDocument();
    });

    it('should render description text', () => {
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      expect(screen.getByText(/masukkan email anda dan kami akan kirimkan link/i)).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      expect(screen.getByPlaceholderText('nama@email.com')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: /kirim instruksi reset/i })).toBeInTheDocument();
    });

    it('should render back to login link', () => {
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('link', { name: /kembali ke login/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty email', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      
      const submitButton = screen.getByRole('button', { name: /kirim instruksi reset/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email wajib diisi/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      await user.type(emailInput, 'invalid-email');
      
      const submitButton = screen.getByRole('button', { name: /kirim instruksi reset/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/format email tidak valid/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call forgotPassword mutation with valid email', async () => {
      const user = userEvent.setup();
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /kirim instruksi reset/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          { email: 'test@example.com' },
          expect.any(Object)
        );
      });
    });
  });

  describe('Success State', () => {
    it('should show success message after submission', async () => {
      // Configure mock to call onSuccess callback
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.();
      });
      
      const user = userEvent.setup();
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /kirim instruksi reset/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /cek email anda/i })).toBeInTheDocument();
      });
    });

    it('should display submitted email in success message', async () => {
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.();
      });
      
      const user = userEvent.setup();
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /kirim instruksi reset/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should show success icon', async () => {
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.();
      });
      
      const user = userEvent.setup();
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /kirim instruksi reset/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/kami telah mengirimkan email/i)).toBeInTheDocument();
      });
    });

    it('should allow resending email from success state', async () => {
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.();
      });
      
      const user = userEvent.setup();
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /kirim instruksi reset/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /cek email anda/i })).toBeInTheDocument();
      });
      
      // Click resend button
      const resendButton = screen.getByRole('button', { name: /kirim ulang/i });
      await user.click(resendButton);
      
      // Should go back to form state
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /lupa password/i })).toBeInTheDocument();
      });
    });

    it('should have back to login link in success state', async () => {
      mockMutate.mockImplementation((data, options) => {
        options?.onSuccess?.();
      });
      
      const user = userEvent.setup();
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /kirim instruksi reset/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /kembali ke login/i });
        expect(link).toHaveAttribute('href', '/login');
      });
    });
  });

  describe('Navigation Links', () => {
    it('should have back to login link pointing to /login', () => {
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      const link = screen.getByRole('link', { name: /kembali ke login/i });
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  describe('Accessibility', () => {
    it('should have form element', () => {
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      expect(document.querySelector('form')).toBeInTheDocument();
    });

    it('should have labeled email input', () => {
      render(<ForgotPasswordPage />, { wrapper: createWrapper() });
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
  });
});
