import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useInstances, useInstance, useTriggerAction, ACTION_LABELS } from './use-instances';

import { createWrapper } from '@/test/test-utils';

// Mock the instance service
vi.mock('@/services/instance.service', () => ({
  instanceService: {
    getInstances: vi.fn(),
    getInstance: vi.fn(),
    triggerAction: vi.fn(),
    getActionStatus: vi.fn(),
  },
}));

import { instanceService } from '@/services/instance.service';

const mockInstancesResponse = {
  data: [
    {
      id: 'inst-1',
      orderId: 'order-1',
      hostname: 'server-1.example.com',
      ipAddress: '192.168.1.1',
      status: 'active' as const,
      plan: { name: 'VPS Basic', cpu: 1, ram: 1024, ssd: 25 },
      image: { name: 'Ubuntu 22.04', distribution: 'ubuntu' },
      region: 'sgp1',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'inst-2',
      orderId: 'order-2',
      hostname: 'server-2.example.com',
      ipAddress: '192.168.1.2',
      status: 'off' as const,
      plan: { name: 'VPS Pro', cpu: 2, ram: 2048, ssd: 50 },
      image: { name: 'Debian 12', distribution: 'debian' },
      region: 'sgp1',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ],
  meta: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  },
};

const mockInstanceDetail = {
  id: 'inst-1',
  orderId: 'order-1',
  hostname: 'server-1.example.com',
  ipAddress: '192.168.1.1',
  ipAddressPrivate: '10.0.0.1',
  status: 'active' as const,
  plan: { name: 'VPS Basic', cpu: 1, ram: 1024, ssd: 25 },
  image: { name: 'Ubuntu 22.04', distribution: 'ubuntu' },
  region: 'sgp1',
  vcpus: 1,
  memory: 1024,
  disk: 25,
  doDropletId: 'do-123',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('use-instances hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ACTION_LABELS', () => {
    it('should have correct labels for all action types', () => {
      expect(ACTION_LABELS.reboot).toBe('Restart Server');
      expect(ACTION_LABELS.power_on).toBe('Nyalakan Server');
      expect(ACTION_LABELS.power_off).toBe('Matikan Server');
      expect(ACTION_LABELS.reset_password).toBe('Reset Password Root');
    });
  });

  describe('useInstances', () => {
    it('should fetch instances successfully', async () => {
      vi.mocked(instanceService.getInstances).mockResolvedValue(mockInstancesResponse);

      const { result } = renderHook(() => useInstances(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInstancesResponse);
      expect(instanceService.getInstances).toHaveBeenCalledTimes(1);
    });

    it('should pass pagination params', async () => {
      vi.mocked(instanceService.getInstances).mockResolvedValue(mockInstancesResponse);

      const { result } = renderHook(
        () => useInstances({ page: 2, limit: 5 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(instanceService.getInstances).toHaveBeenCalledWith({ page: 2, limit: 5 });
    });

    it('should handle error', async () => {
      const error = new Error('Failed to fetch');
      vi.mocked(instanceService.getInstances).mockRejectedValue(error);

      const { result } = renderHook(() => useInstances(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useInstance', () => {
    it('should fetch single instance successfully', async () => {
      vi.mocked(instanceService.getInstance).mockResolvedValue(mockInstanceDetail);

      const { result } = renderHook(() => useInstance('inst-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInstanceDetail);
      expect(instanceService.getInstance).toHaveBeenCalledWith('inst-1');
    });

    it('should not fetch when instanceId is null', async () => {
      const { result } = renderHook(() => useInstance(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(instanceService.getInstance).not.toHaveBeenCalled();
    });

    it('should handle error', async () => {
      const error = new Error('Instance not found');
      vi.mocked(instanceService.getInstance).mockRejectedValue(error);

      const { result } = renderHook(() => useInstance('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useTriggerAction', () => {
    it('should trigger action successfully', async () => {
      const mockActionResponse = {
        id: 1,
        type: 'reboot',
        status: 'in-progress' as const,
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: null,
      };
      vi.mocked(instanceService.triggerAction).mockResolvedValue(mockActionResponse);

      const { result } = renderHook(() => useTriggerAction(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ instanceId: 'inst-1', type: 'reboot' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(instanceService.triggerAction).toHaveBeenCalledWith('inst-1', 'reboot');
    });

    it('should handle all action types', async () => {
      const mockActionResponse = {
        id: 1,
        type: 'power_off',
        status: 'in-progress' as const,
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: null,
      };
      vi.mocked(instanceService.triggerAction).mockResolvedValue(mockActionResponse);

      const { result } = renderHook(() => useTriggerAction(), {
        wrapper: createWrapper(),
      });

      // Test power_off
      result.current.mutate({ instanceId: 'inst-1', type: 'power_off' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(instanceService.triggerAction).toHaveBeenCalledWith('inst-1', 'power_off');
    });

    it('should handle error with toast', async () => {
      const error = {
        response: {
          data: {
            error: {
              message: 'Action failed',
            },
          },
        },
      };
      vi.mocked(instanceService.triggerAction).mockRejectedValue(error);

      const { result } = renderHook(() => useTriggerAction(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ instanceId: 'inst-1', type: 'reboot' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
