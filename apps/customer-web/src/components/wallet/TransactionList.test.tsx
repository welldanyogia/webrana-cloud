import { describe, it, expect } from 'vitest';

import { TransactionList } from './TransactionList';

import type { WalletTransaction } from '@/services/wallet.service';
import { render, screen } from '@/test/test-utils';

const mockTransactions: WalletTransaction[] = [
  {
    id: 'tx-1',
    type: 'CREDIT',
    amount: 100000,
    balanceBefore: 400000,
    balanceAfter: 500000,
    referenceType: 'DEPOSIT',
    referenceId: 'dep-1',
    description: 'Top Up Saldo',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'tx-2',
    type: 'DEBIT',
    amount: 50000,
    balanceBefore: 500000,
    balanceAfter: 450000,
    referenceType: 'ORDER_PAYMENT',
    referenceId: 'order-1',
    description: 'Pembayaran VPS Basic',
    createdAt: '2024-01-14T10:00:00Z',
  },
];

describe('TransactionList', () => {
  it('should render loading state', () => {
    render(<TransactionList transactions={[]} isLoading={true} />);

    expect(screen.getByTestId('transaction-list-loading')).toBeInTheDocument();
  });

  it('should render empty state when no transactions', () => {
    render(<TransactionList transactions={[]} />);

    expect(screen.getByTestId('transaction-list-empty')).toBeInTheDocument();
    expect(screen.getByText('Belum ada transaksi')).toBeInTheDocument();
  });

  it('should render list of transactions', () => {
    render(<TransactionList transactions={mockTransactions} />);

    expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-item-tx-1')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-item-tx-2')).toBeInTheDocument();
  });

  it('should display transaction descriptions', () => {
    render(<TransactionList transactions={mockTransactions} />);

    expect(screen.getByText('Top Up Saldo')).toBeInTheDocument();
    expect(screen.getByText('Pembayaran VPS Basic')).toBeInTheDocument();
  });

  it('should display transaction amounts with correct sign', () => {
    render(<TransactionList transactions={mockTransactions} />);

    // Credit transaction should have + sign
    const creditAmount = screen.getByText(/\+Rp\s*100\.000/);
    expect(creditAmount).toBeInTheDocument();
    expect(creditAmount).toHaveClass('text-emerald-600');

    // Debit transaction should have - sign
    const debitAmount = screen.getByText(/-Rp\s*50\.000/);
    expect(debitAmount).toBeInTheDocument();
    expect(debitAmount).toHaveClass('text-red-600');
  });

  it('should display balance after each transaction', () => {
    render(<TransactionList transactions={mockTransactions} />);

    expect(screen.getByText(/Saldo: Rp\s*500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo: Rp\s*450\.000/)).toBeInTheDocument();
  });

  it('should show credit icon for CREDIT transactions', () => {
    render(<TransactionList transactions={[mockTransactions[0]]} />);

    const creditItem = screen.getByTestId('transaction-item-tx-1');
    const iconContainer = creditItem.querySelector('.bg-emerald-100');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should show debit icon for DEBIT transactions', () => {
    render(<TransactionList transactions={[mockTransactions[1]]} />);

    const debitItem = screen.getByTestId('transaction-item-tx-2');
    const iconContainer = debitItem.querySelector('.bg-red-100');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should fallback to reference type when description is empty', () => {
    const transactionWithoutDescription: WalletTransaction = {
      id: 'tx-3',
      type: 'CREDIT',
      amount: 50000,
      balanceBefore: 0,
      balanceAfter: 50000,
      referenceType: 'BONUS',
      createdAt: '2024-01-13T10:00:00Z',
    };

    render(<TransactionList transactions={[transactionWithoutDescription]} />);

    expect(screen.getByText('Bonus')).toBeInTheDocument();
  });
});
