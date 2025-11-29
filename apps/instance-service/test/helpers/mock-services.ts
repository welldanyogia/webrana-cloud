import {
  DigitalOceanService,
  DropletResponse,
  DropletActionResponse,
} from '../../src/modules/digitalocean/digitalocean.service';
import {
  OrderClientService,
  Order,
  ProvisioningTask,
  OrderItem,
} from '../../src/modules/order-client/order-client.service';

/**
 * Create a mock droplet response
 */
export function createMockDroplet(params: {
  dropletId: string;
  status?: 'active' | 'off' | 'new' | 'archive';
  ipAddress?: string;
}): DropletResponse {
  return {
    id: parseInt(params.dropletId, 10) || 12345678,
    name: `vps-${params.dropletId}`,
    status: params.status || 'active',
    memory: 1024,
    vcpus: 1,
    disk: 25,
    region: {
      slug: 'sgp1',
      name: 'Singapore 1',
    },
    image: {
      id: 12345,
      slug: 'ubuntu-22-04-x64',
      name: 'Ubuntu 22.04 LTS',
      distribution: 'ubuntu',
    },
    size: {
      slug: 's-1vcpu-1gb',
      memory: 1024,
      vcpus: 1,
      disk: 25,
    },
    size_slug: 's-1vcpu-1gb',
    networks: {
      v4: [
        {
          ip_address: params.ipAddress || '103.123.45.67',
          netmask: '255.255.255.0',
          gateway: '103.123.45.1',
          type: 'public',
        },
        {
          ip_address: '10.0.0.5',
          netmask: '255.255.0.0',
          gateway: '10.0.0.1',
          type: 'private',
        },
      ],
      v6: [],
    },
    tags: [],
    created_at: new Date().toISOString(),
  };
}

/**
 * Create a mock action response
 */
export function createMockActionResponse(params: {
  actionId: number;
  type: string;
  status?: 'in-progress' | 'completed' | 'errored';
}): DropletActionResponse {
  return {
    id: params.actionId,
    status: params.status || 'in-progress',
    type: params.type,
    started_at: new Date().toISOString(),
    completed_at: params.status === 'completed' ? new Date().toISOString() : null,
    resource_id: 12345678,
    resource_type: 'droplet',
    region: {
      slug: 'sgp1',
      name: 'Singapore 1',
    },
  };
}

/**
 * Create a mock provisioning task
 */
export function createMockProvisioningTask(params: {
  dropletId: string;
  status?: string;
  ipAddress?: string;
}): ProvisioningTask {
  return {
    id: `task-${params.dropletId}`,
    status: params.status || 'COMPLETED',
    dropletId: params.dropletId,
    dropletName: `vps-${params.dropletId}`,
    dropletStatus: 'active',
    ipv4Public: params.ipAddress || '103.123.45.67',
    ipv4Private: '10.0.0.5',
    doRegion: 'sgp1',
    doSize: 's-1vcpu-1gb',
    doImage: 'ubuntu-22-04-x64',
    errorCode: null,
    errorMessage: null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

/**
 * Create a mock order item
 */
export function createMockOrderItem(orderId: string): OrderItem {
  return {
    id: `item-${orderId}`,
    planId: 'plan-123',
    imageId: 'image-456',
    duration: 'MONTHLY',
    planSnapshot: {
      name: 'VPS Basic 1GB',
      cpu: 1,
      ram: 1024,
      ssd: 25,
      bandwidth: 1000,
    },
    imageSnapshot: {
      name: 'Ubuntu 22.04 LTS',
      distribution: 'ubuntu',
    },
  };
}

/**
 * Create a mock order
 */
export function createMockOrder(params: {
  orderId: string;
  userId: string;
  status?: string;
  dropletId?: string;
  ipAddress?: string;
}): Order {
  return {
    id: params.orderId,
    userId: params.userId,
    status: params.status || 'ACTIVE',
    basePrice: 150000,
    promoDiscount: 0,
    couponDiscount: 0,
    finalPrice: 150000,
    currency: 'IDR',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [createMockOrderItem(params.orderId)],
    provisioningTask: params.dropletId
      ? createMockProvisioningTask({
          dropletId: params.dropletId,
          ipAddress: params.ipAddress,
        })
      : null,
  };
}

/**
 * Create a mock DigitalOceanService
 */
export function createMockDigitalOceanService(): Partial<DigitalOceanService> {
  const droplets = new Map<string, DropletResponse>();

  return {
    getDroplet: jest.fn().mockImplementation((dropletId: string) => {
      const droplet = droplets.get(dropletId) || createMockDroplet({ dropletId });
      return Promise.resolve(droplet);
    }),
    triggerAction: jest.fn().mockImplementation((dropletId: string, actionType: string) => {
      return Promise.resolve(
        createMockActionResponse({
          actionId: Date.now(),
          type: actionType,
          status: 'in-progress',
        })
      );
    }),
    getActionStatus: jest.fn().mockImplementation((dropletId: string, actionId: number) => {
      return Promise.resolve(
        createMockActionResponse({
          actionId,
          type: 'reboot',
          status: 'completed',
        })
      );
    }),
    extractPublicIpv4: jest.fn().mockImplementation((droplet: DropletResponse) => {
      const publicNetwork = droplet.networks?.v4?.find((n) => n.type === 'public');
      return publicNetwork?.ip_address || null;
    }),
    extractPrivateIpv4: jest.fn().mockImplementation((droplet: DropletResponse) => {
      const privateNetwork = droplet.networks?.v4?.find((n) => n.type === 'private');
      return privateNetwork?.ip_address || null;
    }),
    // Helper to set up mock droplet
    _setDroplet: (dropletId: string, droplet: DropletResponse) => {
      droplets.set(dropletId, droplet);
    },
  };
}

/**
 * Create a mock OrderClientService
 */
export function createMockOrderClientService(): Partial<OrderClientService> & {
  _addOrder: (order: Order) => void;
  _clearOrders: () => void;
} {
  const orders = new Map<string, Order>();

  return {
    getActiveOrdersByUserId: jest.fn().mockImplementation((userId: string) => {
      const userOrders = Array.from(orders.values()).filter(
        (o) => o.userId === userId && o.status === 'ACTIVE'
      );
      return Promise.resolve(userOrders);
    }),
    getOrderById: jest.fn().mockImplementation((orderId: string) => {
      return Promise.resolve(orders.get(orderId) || null);
    }),
    // Helper methods for tests
    _addOrder: (order: Order) => {
      orders.set(order.id, order);
    },
    _clearOrders: () => {
      orders.clear();
    },
  };
}
