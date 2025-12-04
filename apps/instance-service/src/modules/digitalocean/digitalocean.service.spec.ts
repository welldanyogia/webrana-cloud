import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios, { AxiosError, AxiosHeaders } from 'axios';

import { DigitalOceanApiException } from '../../common/exceptions';

import {
  DigitalOceanService,
  DropletResponse,
  DropletActionResponse,
} from './digitalocean.service';



jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DigitalOceanService', () => {
  let service: DigitalOceanService;
  let mockAxiosInstance: jest.Mocked<typeof axios>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        DIGITALOCEAN_API_TOKEN: 'test-token',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockDropletResponse: DropletResponse = {
    id: 12345678,
    name: 'vps-test-1234',
    status: 'active',
    memory: 1024,
    vcpus: 1,
    disk: 25,
    region: { slug: 'sgp1', name: 'Singapore 1' },
    image: { id: 123, slug: 'ubuntu-22-04-x64', name: 'Ubuntu 22.04', distribution: 'Ubuntu' },
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
    tags: ['webrana'],
    created_at: '2024-01-15T10:30:00Z',
  };

  const mockActionResponse: DropletActionResponse = {
    id: 987654321,
    status: 'in-progress',
    type: 'reboot',
    started_at: '2024-01-15T10:30:00Z',
    completed_at: null,
    resource_id: 12345678,
    resource_type: 'droplet',
    region: { slug: 'sgp1', name: 'Singapore 1' },
  };

  beforeEach(async () => {
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    } as unknown as jest.Mocked<typeof axios>;

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigitalOceanService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DigitalOceanService>(DigitalOceanService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDroplet', () => {
    it('should get droplet by ID successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { droplet: mockDropletResponse },
      });

      const result = await service.getDroplet('12345678');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v2/droplets/12345678');
      expect(result).toEqual(mockDropletResponse);
    });

    it('should throw DigitalOceanApiException on 404 (not found)', async () => {
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
        DigitalOceanApiException
      );
    });

    it('should throw DigitalOceanApiException on connection error', async () => {
      const error = new AxiosError('Connection refused');
      error.code = 'ECONNREFUSED';
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getDroplet('12345678')).rejects.toThrow(
        DigitalOceanApiException
      );
    });
  });

  describe('triggerAction', () => {
    it('should trigger reboot action successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { action: mockActionResponse },
      });

      const result = await service.triggerAction('12345678', 'reboot');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v2/droplets/12345678/actions',
        { type: 'reboot' }
      );
      expect(result).toEqual(mockActionResponse);
    });

    it('should trigger power_off action successfully', async () => {
      const powerOffAction = { ...mockActionResponse, type: 'power_off' };
      mockAxiosInstance.post.mockResolvedValue({
        data: { action: powerOffAction },
      });

      const result = await service.triggerAction('12345678', 'power_off');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v2/droplets/12345678/actions',
        { type: 'power_off' }
      );
      expect(result.type).toBe('power_off');
    });

    it('should trigger power_on action successfully', async () => {
      const powerOnAction = { ...mockActionResponse, type: 'power_on' };
      mockAxiosInstance.post.mockResolvedValue({
        data: { action: powerOnAction },
      });

      const result = await service.triggerAction('12345678', 'power_on');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v2/droplets/12345678/actions',
        { type: 'power_on' }
      );
      expect(result.type).toBe('power_on');
    });

    it('should trigger password_reset action successfully', async () => {
      const passwordResetAction = { ...mockActionResponse, type: 'password_reset' };
      mockAxiosInstance.post.mockResolvedValue({
        data: { action: passwordResetAction },
      });

      const result = await service.triggerAction('12345678', 'password_reset');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v2/droplets/12345678/actions',
        { type: 'password_reset' }
      );
      expect(result.type).toBe('password_reset');
    });

    it('should throw DigitalOceanApiException on 422 (invalid action)', async () => {
      const error = new AxiosError('Unprocessable Entity');
      error.response = {
        status: 422,
        data: { message: 'Invalid action' },
        statusText: 'Unprocessable Entity',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(service.triggerAction('12345678', 'reboot')).rejects.toThrow(
        DigitalOceanApiException
      );
    });
  });

  describe('getActionStatus', () => {
    it('should get action status successfully', async () => {
      const completedAction = {
        ...mockActionResponse,
        status: 'completed' as const,
        completed_at: '2024-01-15T10:31:00Z',
      };
      mockAxiosInstance.get.mockResolvedValue({
        data: { action: completedAction },
      });

      const result = await service.getActionStatus('12345678', 987654321);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/v2/droplets/12345678/actions/987654321'
      );
      expect(result.status).toBe('completed');
    });

    it('should throw DigitalOceanApiException on 404 (action not found)', async () => {
      const error = new AxiosError('Not Found');
      error.response = {
        status: 404,
        data: { message: 'Action not found' },
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getActionStatus('12345678', 999999999)).rejects.toThrow(
        DigitalOceanApiException
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

  describe('getConsoleUrl', () => {
    it('should return console URL for active droplet', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { droplet: mockDropletResponse },
      });

      const result = await service.getConsoleUrl('12345678');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/v2/droplets/12345678');
      expect(result.consoleUrl).toBe('https://cloud.digitalocean.com/droplets/12345678/console');
      expect(result.dropletStatus).toBe('active');
    });

    it('should return console URL for off droplet', async () => {
      const offDroplet = { ...mockDropletResponse, status: 'off' as const };
      mockAxiosInstance.get.mockResolvedValue({
        data: { droplet: offDroplet },
      });

      const result = await service.getConsoleUrl('12345678');

      expect(result.consoleUrl).toBe('https://cloud.digitalocean.com/droplets/12345678/console');
      expect(result.dropletStatus).toBe('off');
    });

    it('should throw DigitalOceanApiException on 404 (droplet not found)', async () => {
      const error = new AxiosError('Not Found');
      error.response = {
        status: 404,
        data: { message: 'Droplet not found' },
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getConsoleUrl('99999999')).rejects.toThrow(
        DigitalOceanApiException
      );
    });

    it('should throw DigitalOceanApiException on connection error', async () => {
      const error = new AxiosError('Connection refused');
      error.code = 'ECONNREFUSED';
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(service.getConsoleUrl('12345678')).rejects.toThrow(
        DigitalOceanApiException
      );
    });
  });
});
