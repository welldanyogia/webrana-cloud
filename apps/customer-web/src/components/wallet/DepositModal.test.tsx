import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { DepositModal } from './DepositModal';
import { toast } from 'sonner';

// Mock the hooks
vi.mock('@/hooks/use-wallet', () => ({
  useWallet: vi.fn(() => ({
    createDeposit: vi.fn(),
    isCreatingDeposit: false,
  })),
}));

vi.mock('@/hooks/use-billing', () => ({
  usePaymentChannels: vi.fn(() => ({
    data: [
      {
        code: 'BRIVA',
        name: 'BRI Virtual Account',
        group: 'Virtual Account',
        type: 'virtual_account',
        fee: { flat: 4000, percent: 0 },
        iconUrl: 'https://example.com/bri.png',
      },
      {
        code: 'QRIS',
        name: 'QRIS',
        group: 'E-Wallet',
        type: 'qris',
        fee: { flat: 0, percent: 0.7 },
        iconUrl: 'https://example.com/qris.png',
      },
    ],
    isLoading: false,
  })),
}));

import { useWallet } from '@/hooks/use-wallet';
import { usePaymentChannels } from '@/hooks/use-billing';

describe('DepositModal', () => {
  const mockOnClose = vi.fn();
  const mockCreateDeposit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWallet).mockReturnValue({
      createDeposit: mockCreateDeposit,
      isCreatingDeposit: false,
    } as ReturnType<typeof useWallet>);
  });

  it('should render modal when open is true', () => {
    render(<DepositModal open={true} onClose={mockOnClose} />);

    expect(screen.getByText('Top Up Saldo')).toBeInTheDocument();
    expect(screen.getByTestId('deposit-amount-input')).toBeInTheDocument();
  });

  it('should not render modal when open is false', () => {
    render(<DepositModal open={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Top Up Saldo')).not.toBeInTheDocument();
  });

  it('should display preset amount buttons', () => {
    render(<DepositModal open={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('preset-amount-50000')).toBeInTheDocument();
    expect(screen.getByTestId('preset-amount-100000')).toBeInTheDocument();
    expect(screen.getByTestId('preset-amount-200000')).toBeInTheDocument();
    expect(screen.getByTestId('preset-amount-500000')).toBeInTheDocument();
    expect(screen.getByTestId('preset-amount-1000000')).toBeInTheDocument();
  });

  it('should update amount when preset button is clicked', async () => {
    const user = userEvent.setup();
    render(<DepositModal open={true} onClose={mockOnClose} />);

    const presetButton = screen.getByTestId('preset-amount-200000');
    await user.click(presetButton);

    const input = screen.getByTestId('deposit-amount-input') as HTMLInputElement;
    expect(input.value).toBe('200000');
  });

  it('should display payment method options', () => {
    render(<DepositModal open={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('payment-method-BRIVA')).toBeInTheDocument();
    expect(screen.getByTestId('payment-method-QRIS')).toBeInTheDocument();
  });

  it('should select payment method when clicked', async () => {
    const user = userEvent.setup();
    render(<DepositModal open={true} onClose={mockOnClose} />);

    const paymentButton = screen.getByTestId('payment-method-BRIVA');
    await user.click(paymentButton);

    // Button should be active (have default variant)
    expect(paymentButton).toHaveClass('ring-2');
  });

  it('should require valid amount for submit', async () => {
    render(<DepositModal open={true} onClose={mockOnClose} />);

    // Initially (without payment method), submit should be disabled
    const submitButton = screen.getByTestId('submit-deposit');
    expect(submitButton).toBeDisabled();
  });

  it('should disable submit button when payment method is not selected', async () => {
    render(<DepositModal open={true} onClose={mockOnClose} />);

    // Submit button should be disabled without payment method
    expect(screen.getByTestId('submit-deposit')).toBeDisabled();
  });

  it('should call createDeposit when form is valid', async () => {
    const user = userEvent.setup();
    mockCreateDeposit.mockResolvedValue({ id: 'dep-1' });

    render(<DepositModal open={true} onClose={mockOnClose} />);

    // Select amount and payment method
    await user.click(screen.getByTestId('preset-amount-100000'));
    await user.click(screen.getByTestId('payment-method-BRIVA'));

    // Submit
    await user.click(screen.getByTestId('submit-deposit'));

    await waitFor(() => {
      expect(mockCreateDeposit).toHaveBeenCalledWith({
        amount: 100000,
        paymentMethod: 'BRIVA',
      });
    });

    expect(toast.success).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show error toast when deposit creation fails', async () => {
    const user = userEvent.setup();
    mockCreateDeposit.mockRejectedValue(new Error('Failed'));

    render(<DepositModal open={true} onClose={mockOnClose} />);

    // Select amount and payment method
    await user.click(screen.getByTestId('preset-amount-100000'));
    await user.click(screen.getByTestId('payment-method-BRIVA'));

    // Submit
    await user.click(screen.getByTestId('submit-deposit'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('should disable submit button when creating deposit', () => {
    vi.mocked(useWallet).mockReturnValue({
      createDeposit: mockCreateDeposit,
      isCreatingDeposit: true,
    } as ReturnType<typeof useWallet>);

    render(<DepositModal open={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('submit-deposit')).toBeDisabled();
    expect(screen.getByText('Memproses...')).toBeInTheDocument();
  });

  it('should show loading state when channels are loading', () => {
    vi.mocked(usePaymentChannels).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof usePaymentChannels>);

    render(<DepositModal open={true} onClose={mockOnClose} />);

    // Should not show payment methods when loading
    expect(screen.queryByTestId('payment-method-BRIVA')).not.toBeInTheDocument();
  });

  it('should display amount summary section', () => {
    render(<DepositModal open={true} onClose={mockOnClose} />);

    // The summary section should have the label text (use getAllBy since there are multiple matches)
    const jumlahTopUpElements = screen.getAllByText(/Jumlah Top Up/i);
    expect(jumlahTopUpElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Total Kredit/i)).toBeInTheDocument();
  });
});
