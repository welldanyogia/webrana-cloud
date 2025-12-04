import { render, screen, fireEvent } from '@/test/test-utils';
import { describe, it, expect, vi } from 'vitest';
import { VpsCard } from './VpsCard';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}));

// Mock child components to simplify test and focus on VpsCard logic
vi.mock('./VpsConsoleButton', () => ({
  VpsConsoleButton: () => <button data-testid="console-btn">Console</button>,
}));

vi.mock('./VpsExpiryCountdown', () => ({
  VpsExpiryCountdown: () => <div data-testid="expiry-countdown">10 days left</div>,
}));

// Mock VpsStatusBadge since we already tested it separately, 
// but keeping it real is also fine. Let's keep it real for integration or mock if complex.
// Since it's simple, let's not mock it to check integration.

const mockVpsActive: any = {
  id: 'vps-123',
  planName: 'Standard Plan',
  imageName: 'Ubuntu 22.04',
  status: 'ACTIVE',
  autoRenew: true,
  expiresAt: '2024-12-31T23:59:59Z',
  plan: {
    vcpu: 2,
    memory: 4096,
    disk: 80,
    bandwidth: 2000,
  },
  provisioningTask: {
    ipv4Public: '203.0.113.1',
  },
};

const mockVpsProvisioning: any = {
  ...mockVpsActive,
  id: 'vps-456',
  status: 'PROVISIONING',
  provisioningTask: null, // No IP yet
};

describe('VpsCard', () => {
  it('should render VPS information correctly', () => {
    render(<VpsCard vps={mockVpsActive} />);
    
    expect(screen.getByText('Standard Plan')).toBeInTheDocument();
    expect(screen.getByText('Ubuntu 22.04')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.1')).toBeInTheDocument();
    expect(screen.getByText(/4 GB/)).toBeInTheDocument(); // From VpsSpecsDisplay
    expect(screen.getByText('Aktif')).toBeInTheDocument(); // From StatusBadge
  });

  it('should allow copying IP address', () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    render(<VpsCard vps={mockVpsActive} />);
    
    const copyButton = screen.getByTitle('Copy IP');
    fireEvent.click(copyButton);
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('203.0.113.1');
    expect(toast.success).toHaveBeenCalledWith('IP address disalin');
  });

  it('should show provisioning state correctly', () => {
    render(<VpsCard vps={mockVpsProvisioning} />);
    
    expect(screen.getByText('Sedang dibuat...')).toBeInTheDocument();
    // IP should not be present
    expect(screen.queryByText('203.0.113.1')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Copy IP')).not.toBeInTheDocument();
  });

  it('should show expiry countdown when active', () => {
    render(<VpsCard vps={mockVpsActive} />);
    expect(screen.getByTestId('expiry-countdown')).toBeInTheDocument();
    expect(screen.getByText('Sisa Waktu:')).toBeInTheDocument();
  });

  it('should show console button when active', () => {
    render(<VpsCard vps={mockVpsActive} />);
    expect(screen.getByTestId('console-btn')).toBeInTheDocument();
  });

  it('should disable/hide console button when not active', () => {
    // Depending on implementation, it might be hidden or disabled.
    // In VpsCard.tsx: {isActive && (<VpsConsoleButton ... />)}
    // So it should be absent if not active
    render(<VpsCard vps={mockVpsProvisioning} />);
    expect(screen.queryByTestId('console-btn')).not.toBeInTheDocument();
  });

  it('should show auto-renew status', () => {
    render(<VpsCard vps={mockVpsActive} />);
    expect(screen.getByText('Auto-renew aktif')).toBeInTheDocument();
    
    const mockNoAutoRenew = { ...mockVpsActive, autoRenew: false };
    render(<VpsCard vps={mockNoAutoRenew} />); // Re-render with new props needs cleanup or new test block, but render cleans up automatically in RTL
  });
});
