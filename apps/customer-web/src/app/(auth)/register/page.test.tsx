import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterPage from './page';

// Mock the useRegister hook
const mockMutate = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useRegister: () => ({
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

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the register page', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('heading', { name: /daftar gratis/i })).toBeInTheDocument();
    });

    it('should render name input', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByPlaceholderText('nama@email.com')).toBeInTheDocument();
    });

    it('should render password input', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByPlaceholderText('Buat password')).toBeInTheDocument();
    });

    it('should render confirm password input', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByPlaceholderText('Ulangi password')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: /^daftar$/i })).toBeInTheDocument();
    });

    it('should render terms checkbox', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByText(/saya menyetujui/i)).toBeInTheDocument();
    });

    it('should render login link', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByRole('link', { name: /masuk/i })).toBeInTheDocument();
    });

    it('should render description text', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByText(/buat akun anda dan deploy vps/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty name', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const submitButton = screen.getByRole('button', { name: /^daftar$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/nama wajib diisi/i)).toBeInTheDocument();
      });
    });

    it('should show error for name less than 2 characters', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const nameInput = screen.getByPlaceholderText('John Doe');
      await user.type(nameInput, 'A');
      
      const submitButton = screen.getByRole('button', { name: /^daftar$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/nama minimal 2 karakter/i)).toBeInTheDocument();
      });
    });

    it('should show error for empty email', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const nameInput = screen.getByPlaceholderText('John Doe');
      await user.type(nameInput, 'John Doe');
      
      const submitButton = screen.getByRole('button', { name: /^daftar$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email wajib diisi/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const nameInput = screen.getByPlaceholderText('John Doe');
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'invalid-email');
      
      const submitButton = screen.getByRole('button', { name: /^daftar$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/format email tidak valid/i)).toBeInTheDocument();
      });
    });

    it('should show error for weak password', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const nameInput = screen.getByPlaceholderText('John Doe');
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      const passwordInput = screen.getByPlaceholderText('Buat password');
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'weak');
      
      const submitButton = screen.getByRole('button', { name: /^daftar$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password minimal 8 karakter/i)).toBeInTheDocument();
      });
    });

    it('should show error for password without required characters', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const nameInput = screen.getByPlaceholderText('John Doe');
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      const passwordInput = screen.getByPlaceholderText('Buat password');
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'alllowercase');
      
      const submitButton = screen.getByRole('button', { name: /^daftar$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password harus mengandung huruf besar, huruf kecil, dan angka/i)).toBeInTheDocument();
      });
    });

    it('should show error for password mismatch', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const nameInput = screen.getByPlaceholderText('John Doe');
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      const passwordInput = screen.getByPlaceholderText('Buat password');
      const confirmInput = screen.getByPlaceholderText('Ulangi password');
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmInput, 'Different123');
      
      const submitButton = screen.getByRole('button', { name: /^daftar$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password tidak cocok/i)).toBeInTheDocument();
      });
    });

    it('should show error if terms not accepted', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const nameInput = screen.getByPlaceholderText('John Doe');
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      const passwordInput = screen.getByPlaceholderText('Buat password');
      const confirmInput = screen.getByPlaceholderText('Ulangi password');
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmInput, 'Password123');
      
      const submitButton = screen.getByRole('button', { name: /^daftar$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/anda harus menyetujui syarat dan ketentuan/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Strength Indicator', () => {
    it('should show password strength when typing', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const passwordInput = screen.getByPlaceholderText('Buat password');
      await user.type(passwordInput, 'Test');
      
      expect(screen.getByText(/kekuatan:/i)).toBeInTheDocument();
    });

    it('should indicate weak password', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const passwordInput = screen.getByPlaceholderText('Buat password');
      await user.type(passwordInput, 'test');
      
      expect(screen.getByText(/lemah/i)).toBeInTheDocument();
    });

    it('should indicate strong password', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const passwordInput = screen.getByPlaceholderText('Buat password');
      await user.type(passwordInput, 'Password123!');
      
      expect(screen.getByText(/sangat kuat/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call register mutation with valid data', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const nameInput = screen.getByPlaceholderText('John Doe');
      const emailInput = screen.getByPlaceholderText('nama@email.com');
      const passwordInput = screen.getByPlaceholderText('Buat password');
      const confirmInput = screen.getByPlaceholderText('Ulangi password');
      const termsCheckbox = screen.getByRole('checkbox');
      
      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123');
      await user.type(confirmInput, 'Password123');
      await user.click(termsCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /^daftar$/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123',
        });
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const passwordInput = screen.getByPlaceholderText('Buat password');
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Find toggle buttons - there are multiple
      const buttons = screen.getAllByRole('button');
      const toggleButtons = buttons.filter(btn => 
        btn.querySelector('svg') && !btn.textContent?.includes('Daftar')
      );
      
      // First toggle is for password field
      if (toggleButtons.length > 0) {
        await user.click(toggleButtons[0]);
        expect(passwordInput).toHaveAttribute('type', 'text');
      }
    });

    it('should toggle confirm password visibility', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />, { wrapper: createWrapper() });
      
      const confirmInput = screen.getByPlaceholderText('Ulangi password');
      expect(confirmInput).toHaveAttribute('type', 'password');
      
      const buttons = screen.getAllByRole('button');
      const toggleButtons = buttons.filter(btn => 
        btn.querySelector('svg') && !btn.textContent?.includes('Daftar')
      );
      
      // Second toggle is for confirm password field
      if (toggleButtons.length > 1) {
        await user.click(toggleButtons[1]);
        expect(confirmInput).toHaveAttribute('type', 'text');
      }
    });
  });

  describe('Navigation Links', () => {
    it('should have login link pointing to /login', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      const link = screen.getByRole('link', { name: /masuk/i });
      expect(link).toHaveAttribute('href', '/login');
    });

    it('should have terms link', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      const link = screen.getByRole('link', { name: /syarat dan ketentuan/i });
      expect(link).toHaveAttribute('href', '/terms');
    });

    it('should have privacy link', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      const link = screen.getByRole('link', { name: /kebijakan privasi/i });
      expect(link).toHaveAttribute('href', '/privacy');
    });
  });

  describe('Accessibility', () => {
    it('should have form element', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(document.querySelector('form')).toBeInTheDocument();
    });

    it('should have labeled inputs', () => {
      render(<RegisterPage />, { wrapper: createWrapper() });
      expect(screen.getByText('Nama Lengkap')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('Konfirmasi Password')).toBeInTheDocument();
    });
  });
});
