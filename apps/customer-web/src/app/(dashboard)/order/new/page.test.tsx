import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewOrderPage from './page';

// Mocks
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

// Mock UI components to isolate page logic and prevent re-render loops
vi.mock('@/components/ui/input', () => ({
  Input: ({ onChange, onBlur, value, label, error, ...props }: any) => (
    <div data-testid="mock-input">
      <label>{label}</label>
      <input 
        onChange={onChange} 
        onBlur={onBlur} 
        value={value} 
        data-error={error}
        aria-label={label}
        {...props} 
      />
      {error && <span>{error}</span>}
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Mock child components to avoid render loops or complexity
vi.mock('./VpsSpecsDisplay', () => ({
  VpsSpecsDisplay: () => <div data-testid="vps-specs">Specs</div>,
}));

// Mock hook results to ensure stability
const mockPlansResult = {
  data: [
    {
      id: 'plan-1',
      name: 'Basic Plan',
      cpu: 1,
      ram: 1024,
      ssd: 20,
      bandwidth: 1000,
      isActive: true,
      pricing: [
        { duration: 'MONTHLY', price: 50000 },
        { duration: 'YEARLY', price: 500000 },
      ],
    },
    {
      id: 'plan-2',
      name: 'Pro Plan',
      cpu: 2,
      ram: 2048,
      ssd: 40,
      bandwidth: 2000,
      isActive: true,
      pricing: [
        { duration: 'MONTHLY', price: 100000 },
        { duration: 'YEARLY', price: 1000000 },
      ],
    },
  ],
  isLoading: false,
};

const mockImagesResult = {
  data: [
    {
      id: 'img-1',
      name: 'Ubuntu 20.04',
      distribution: 'Ubuntu',
      version: '20.04',
      isActive: true,
    },
    {
      id: 'img-2',
      name: 'Debian 11',
      distribution: 'Debian',
      version: '11',
      isActive: true,
    },
  ],
  isLoading: false,
};

const mockValidateCoupon = vi.fn();
const mockCreateOrder = vi.fn();

const mockValidateCouponResult = {
  mutate: mockValidateCoupon,
  isPending: false,
  isError: false,
};

const mockCreateOrderResult = {
  mutate: mockCreateOrder,
  isPending: false,
};

vi.mock('@/hooks/use-catalog', () => ({
  usePlans: () => mockPlansResult,
  useImages: () => mockImagesResult,
  useValidateCoupon: () => mockValidateCouponResult,
}));

vi.mock('@/hooks/use-orders', () => ({
  useCreateOrder: () => mockCreateOrderResult,
}));

describe('NewOrderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the wizard steps', () => {
    render(<NewOrderPage />);
    expect(screen.getByText('Pilih Paket VPS')).toBeInTheDocument();
  });

  it('should allow selecting a plan and proceeding to OS selection', async () => {
    render(<NewOrderPage />);
    
    // Step 1: Select Plan
    const basicPlanBtn = screen.getAllByText('Basic Plan')[0].closest('button');
    fireEvent.click(basicPlanBtn!);
    
    const nextBtn = screen.getByRole('button', { name: /lanjutkan/i });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    // Should be on Step 2
    expect(screen.getByText('Pilih Sistem Operasi')).toBeInTheDocument();
  });

  it('should allow full order flow', async () => {
    render(<NewOrderPage />);

    // --- Step 1: Plan ---
    fireEvent.click(screen.getAllByText('Basic Plan')[0].closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /lanjutkan/i }));

    // --- Step 2: OS ---
    await waitFor(() => expect(screen.getByText('Pilih Sistem Operasi')).toBeInTheDocument());
    
    // Select OS
    const osButton = screen.getAllByText('Ubuntu 20.04')[0].closest('button');
    fireEvent.click(osButton!);
    
    const nextBtn2 = screen.getByRole('button', { name: /lanjutkan/i });
    await waitFor(() => expect(nextBtn2).not.toBeDisabled());
    fireEvent.click(nextBtn2);

    // --- Step 3: Hostname ---
    await waitFor(() => expect(screen.getByText('Konfigurasi Server')).toBeInTheDocument());
    const hostnameInput = screen.getByLabelText(/hostname/i);
    fireEvent.change(hostnameInput, { target: { value: 'myserver' } });
    
    const nextBtn3 = screen.getByRole('button', { name: /lanjutkan/i });
    await waitFor(() => expect(nextBtn3).not.toBeDisabled());
    fireEvent.click(nextBtn3);

    // --- Step 4: Coupon (Optional) ---
    await waitFor(() => expect(screen.getByText('Kode Kupon (Opsional)')).toBeInTheDocument());
    
    // Skip coupon
    const nextBtn4 = screen.getByRole('button', { name: /lanjutkan/i });
    expect(nextBtn4).not.toBeDisabled(); 
    fireEvent.click(nextBtn4);

    // --- Step 5: Review ---
    await waitFor(() => expect(screen.getByText('Review Pesanan')).toBeInTheDocument());
    expect(screen.getAllByText('Basic Plan')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Ubuntu 20.04')[0]).toBeInTheDocument();
    expect(screen.getByText('myserver')).toBeInTheDocument();
    
    // Submit
    const createBtn = screen.getByRole('button', { name: /buat pesanan/i });
    fireEvent.click(createBtn);

    expect(mockCreateOrder).toHaveBeenCalledWith({
      planId: 'plan-1',
      imageId: 'img-1',
      duration: 1,
      durationUnit: 'MONTHLY',
      hostname: 'myserver',
      couponCode: undefined,
    });
  });

  it('should validate hostname', async () => {
    render(<NewOrderPage />);

    // Skip to step 3
    fireEvent.click(screen.getAllByText('Basic Plan')[0].closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /lanjutkan/i }));
    fireEvent.click(screen.getAllByText('Ubuntu 20.04')[0].closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /lanjutkan/i }));

    // Verify step 3
    expect(screen.getByText('Konfigurasi Server')).toBeInTheDocument();
    
    const hostnameInput = screen.getByLabelText(/hostname/i);
    const nextBtn = screen.getByRole('button', { name: /lanjutkan/i });

    // Invalid hostname
    fireEvent.change(hostnameInput, { target: { value: 'invalid hostname' } });
    fireEvent.blur(hostnameInput);
    expect(screen.getByText('Hostname hanya boleh huruf, angka, dan strip (-)')).toBeInTheDocument();
    // Note: In our mock input, error is displayed as span.
    
    // Valid hostname
    fireEvent.change(hostnameInput, { target: { value: 'valid-hostname-123' } });
    expect(screen.queryByText('Hostname hanya boleh huruf, angka, dan strip (-)')).not.toBeInTheDocument();
    
    fireEvent.blur(hostnameInput);
    await waitFor(() => expect(nextBtn).not.toBeDisabled());
  });
});
