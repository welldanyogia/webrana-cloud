/**
 * Mock DigitalOcean Client Service
 * 
 * Provides mock implementations for DigitalOcean API calls in integration tests.
 * Simulates droplet creation and status polling without making real API calls.
 */

export const MOCK_DROPLET_ID = '12345678';
export const MOCK_DROPLET_IPV4_PUBLIC = '143.198.123.45';
export const MOCK_DROPLET_IPV4_PRIVATE = '10.130.0.2';
export const MOCK_DO_REGION = 'sgp1';

/**
 * Mock Create Droplet Response
 */
export const mockCreateDropletResponse = {
  id: MOCK_DROPLET_ID,
  name: 'vps-order-test',
  status: 'new',
  created_at: new Date().toISOString(),
  size_slug: 's-1vcpu-1gb',
  image: {
    id: 12345,
    name: 'Ubuntu 22.04 LTS',
    slug: 'ubuntu-22-04-x64',
  },
  region: {
    slug: MOCK_DO_REGION,
    name: 'Singapore 1',
  },
  networks: {
    v4: [],
  },
  tags: ['webrana', 'order-service'],
};

/**
 * Mock Get Droplet Response - "new" status (still provisioning)
 */
export const mockDropletStatusNew = {
  id: MOCK_DROPLET_ID,
  name: 'vps-order-test',
  status: 'new',
  created_at: new Date().toISOString(),
  size_slug: 's-1vcpu-1gb',
  image: {
    id: 12345,
    name: 'Ubuntu 22.04 LTS',
    slug: 'ubuntu-22-04-x64',
  },
  region: {
    slug: MOCK_DO_REGION,
    name: 'Singapore 1',
  },
  networks: {
    v4: [],
  },
  tags: ['webrana', 'order-service'],
};

/**
 * Mock Get Droplet Response - "active" status (ready)
 */
export const mockDropletStatusActive = {
  id: MOCK_DROPLET_ID,
  name: 'vps-order-test',
  status: 'active',
  created_at: new Date().toISOString(),
  size_slug: 's-1vcpu-1gb',
  image: {
    id: 12345,
    name: 'Ubuntu 22.04 LTS',
    slug: 'ubuntu-22-04-x64',
  },
  region: {
    slug: MOCK_DO_REGION,
    name: 'Singapore 1',
  },
  networks: {
    v4: [
      {
        ip_address: MOCK_DROPLET_IPV4_PUBLIC,
        netmask: '255.255.240.0',
        gateway: '143.198.112.1',
        type: 'public',
      },
      {
        ip_address: MOCK_DROPLET_IPV4_PRIVATE,
        netmask: '255.255.0.0',
        gateway: '10.130.0.1',
        type: 'private',
      },
    ],
  },
  tags: ['webrana', 'order-service'],
};

/**
 * Mock Get Droplet Response - "errored" status (failed)
 */
export const mockDropletStatusErrored = {
  id: MOCK_DROPLET_ID,
  name: 'vps-order-test',
  status: 'errored',
  created_at: new Date().toISOString(),
  size_slug: 's-1vcpu-1gb',
  image: {
    id: 12345,
    name: 'Ubuntu 22.04 LTS',
    slug: 'ubuntu-22-04-x64',
  },
  region: {
    slug: MOCK_DO_REGION,
    name: 'Singapore 1',
  },
  networks: {
    v4: [],
  },
  tags: ['webrana', 'order-service'],
};

/**
 * Create mock DigitalOceanClientService for successful provisioning
 * 
 * Simulates: createDroplet() returns new droplet, getDroplet() returns "new" first,
 * then "active" on subsequent calls.
 */
export function createMockDigitalOceanClientService(options?: {
  failOnCreate?: boolean;
  finalStatus?: 'active' | 'errored' | 'new';
  pollsBeforeActive?: number;
}) {
  const { failOnCreate = false, finalStatus = 'active', pollsBeforeActive = 2 } = options || {};
  let pollCount = 0;

  return {
    createDroplet: jest.fn().mockImplementation((params: any) => {
      if (failOnCreate) {
        return Promise.reject(new Error('Failed to create droplet'));
      }
      return Promise.resolve({
        ...mockCreateDropletResponse,
        name: params.name || mockCreateDropletResponse.name,
      });
    }),

    getDroplet: jest.fn().mockImplementation((dropletId: string) => {
      pollCount++;

      if (finalStatus === 'errored') {
        return Promise.resolve(mockDropletStatusErrored);
      }

      if (finalStatus === 'new') {
        // Always return "new" (for timeout testing)
        return Promise.resolve(mockDropletStatusNew);
      }

      // Return "new" for first N polls, then "active"
      if (pollCount <= pollsBeforeActive) {
        return Promise.resolve(mockDropletStatusNew);
      }
      return Promise.resolve(mockDropletStatusActive);
    }),

    // IP extraction helpers
    extractPublicIpv4: jest.fn().mockImplementation((droplet: any) => {
      const publicNetwork = droplet?.networks?.v4?.find(
        (n: any) => n.type === 'public'
      );
      return publicNetwork?.ip_address || null;
    }),

    extractPrivateIpv4: jest.fn().mockImplementation((droplet: any) => {
      const privateNetwork = droplet?.networks?.v4?.find(
        (n: any) => n.type === 'private'
      );
      return privateNetwork?.ip_address || null;
    }),

    // Helper to reset poll count between tests
    resetPollCount: () => {
      pollCount = 0;
    },
  };
}

/**
 * Create mock for failed droplet creation
 */
export function createFailingDigitalOceanMock(errorMessage = 'DigitalOcean API error') {
  return {
    createDroplet: jest.fn().mockRejectedValue(new Error(errorMessage)),
    getDroplet: jest.fn().mockRejectedValue(new Error(errorMessage)),
    extractPublicIpv4: jest.fn().mockReturnValue(null),
    extractPrivateIpv4: jest.fn().mockReturnValue(null),
  };
}
