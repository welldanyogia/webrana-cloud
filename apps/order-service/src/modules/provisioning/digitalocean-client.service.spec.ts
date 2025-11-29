import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  DigitalOceanClientService,
  CreateDropletConfig,
  DropletResponse,
} from './digitalocean-client.service';
import { DigitalOceanUnavailableException } from '../../common/exceptions';
import axios, { AxiosError, AxiosHeaders } from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DigitalOceanClientService', () => {
  let service: DigitalOceanClientService;
  let mockAxiosInstance: jest.Mocked<typeof axios>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        DIGITALOCEAN_API_TOKEN: 'test-token',
        DIGITALOCEAN_DEFAULT_REGION: 'sgp1',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockDropletResponse: DropletResponse = {
    id: 12345678,
    name: 'vps-test-1234',
    status: 'new',
    memory: 1024,
    vcpus: 1,
    disk: 25,
    region: { slug: 'sgp1', name: 'Singapore 1' },
    image: { id: 123, slug: 'ubuntu-22-04-x64', name: 'Ubuntu 22.04' },
    size: { slug: 's-1vcpu-1gb', memory: 1024, vcpus: 1, disk: 25 },
    size_slug: 's-1vcpu-1gb',
    networks: {
      v4: [
        {
          ip_address: '143.198.123.45',
          netmask: '255.255.240.0',
          gateway: '143.198.112.1',
          type: 'public',
        },
        {
          ip_address: '10.130.0.2',
          netmask: '255.255.0.0',
          gateway: '10.130.0.1',
          type: 'private',
        },
      ],
      v6: [],
    },
    tags: ['webrana', 'order-test'],
    created_at: '2024-01-15T10:30:00Z',
  };

  beforeEach(async () => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<typeof axios>;

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigitalOceanClientService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DigitalOceanClientService>(DigitalOceanClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDroplet', () => {
    const dropletConfig: CreateDropletConfig = {
      name: 'vps-test-1234',
      region: 'sgp1',
      size: 's-1vcpu-1gb',
      image: 'ubuntu-22-04-x64',
      tags: ['webrana', 'order-test'],
      monitoring: true,
    };

    it('should create a droplet successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { droplet: mockDropletResponse },
      });

      const result = await service.createDroplet(dropletConfig);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/v2/droplets', {
        name: 'vps-test-1234',
        region: 'sgp1',
        size: 's-1vcpu-1gb',
        image: 'ubuntu-22-04-x64',
        tags: ['webrana', 'order-test'],
        ssh_keys: [],
        backups: false,
        ipv6: false,
        monitoring: true,
      });
      expect(result).toEqual(mockDropletResponse);
    });

    it('should use default region if not specified', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { droplet: mockDropletResponse },
      });

      await service.createDroplet({
        name: 'test',
        region: '',
        size: 's-1vcpu-1gb',
        image: 'ubuntu-22-04-x64',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v2/droplets',
        expect.objectContaining({ region: 'sgp1' })
      );
    });

    it('should throw DigitalOceanUnavailableException on connection error', async () => {
      const error = new AxiosError('Connection refused');
      error.code = 'ECONNREFUSED';
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(service.createDroplet(dropletConfig)).rejects.toThrow(
        DigitalOceanUnavailableException
      );
    });

    it('should throw DigitalOceanUnavailableException on timeout', async () => {
      const error = new AxiosError('Timeout');
      error.code = 'ETIMEDOUT';
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(service.createDroplet(dropletConfig)).rejects.toThrow(
        DigitalOceanUnavailableException
      );
    });

    it('should throw DigitalOceanUnavailableException on 401 (unauthorized)', async () => {
      const error = new AxiosError('Unauthorized');
      error.response = {
        status: 401,
        data: { message: 'Invalid token' },
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(service.createDroplet(dropletConfig)).rejects.toThrow(
        DigitalOceanUnavailableException
      );
    });

    it('should throw DigitalOceanUnavailableException on 422 (invalid config)', async () => {
      const error = new AxiosError('Unprocessable Entity');
      error.response = {
        status: 422,
        data: { message: 'Invalid size slug' },
        statusText: 'Unprocessable Entity',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(service.createDroplet(dropletConfig)).rejects.toThrow(
        DigitalOceanUnavailableException
      );
    });
  });

  describe('getDroplet', () => {
    it('should get droplet by ID successfully', async () => {
      const activeDroplet = { ...mockDropletResponse, status: 'active' as const };
      mockAxiosInstance.get.mockResolvedValue({
        data: { droplet: activeDroplet },
      });

      const result = await service.getDroplet('12345678');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v2/droplets/12345678');
      expect(result).toEqual(activeDroplet);
      expect(result.status).toBe('active');
    });

    it('should throw DigitalOceanUnavailableException on 404 (not found)', async () => {
      const error = new AxiosError('Not Found');
      error.response = {
        status: 404,
        data: { message: 'Droplet not found' },
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getDroplet('99999999')).rejects.toThrow(
        DigitalOceanUnavailableException
      );
    });

    it('should throw DigitalOceanUnavailableException on connection error', async () => {
      const error = new AxiosError('Connection refused');
      error.code = 'ECONNREFUSED';
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getDroplet('12345678')).rejects.toThrow(
        DigitalOceanUnavailableException
      );
    });
  });

  describe('extractPublicIpv4', () => {
    it('should extract public IPv4 address', () => {
      const ip = service.extractPublicIpv4(mockDropletResponse);
      expect(ip).toBe('143.198.123.45');
    });

    it('should return null if no public IP', () => {
      const noPublicIp = {
        ...mockDropletResponse,
        networks: { v4: [], v6: [] },
      };
      const ip = service.extractPublicIpv4(noPublicIp);
      expect(ip).toBeNull();
    });
  });

  describe('extractPrivateIpv4', () => {
    it('should extract private IPv4 address', () => {
      const ip = service.extractPrivateIpv4(mockDropletResponse);
      expect(ip).toBe('10.130.0.2');
    });

    it('should return null if no private IP', () => {
      const noPrivateIp = {
        ...mockDropletResponse,
        networks: {
          v4: [mockDropletResponse.networks.v4[0]],
          v6: [],
        },
      };
      const ip = service.extractPrivateIpv4(noPrivateIp);
      expect(ip).toBeNull();
    });
  });
});
