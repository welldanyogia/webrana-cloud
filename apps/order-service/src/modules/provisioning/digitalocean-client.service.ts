import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { DigitalOceanUnavailableException } from '../../common/exceptions';

// DigitalOcean API Types
export interface CreateDropletConfig {
  name: string;
  region: string;
  size: string;
  image: string;
  tags?: string[];
  ssh_keys?: string[];
  backups?: boolean;
  ipv6?: boolean;
  monitoring?: boolean;
}

export interface DropletNetwork {
  ip_address: string;
  netmask: string;
  gateway: string;
  type: 'public' | 'private';
}

export interface DropletResponse {
  id: number;
  name: string;
  status: 'new' | 'active' | 'off' | 'archive' | 'errored';
  memory: number;
  vcpus: number;
  disk: number;
  region: {
    slug: string;
    name: string;
  };
  image: {
    id: number;
    slug: string;
    name: string;
  };
  size: {
    slug: string;
    memory: number;
    vcpus: number;
    disk: number;
  };
  size_slug: string;
  networks: {
    v4: DropletNetwork[];
    v6: Array<{ ip_address: string; netmask: number; gateway: string; type: string }>;
  };
  tags: string[];
  created_at: string;
}

export interface CreateDropletResponse {
  droplet: DropletResponse;
}

export interface GetDropletResponse {
  droplet: DropletResponse;
}

/**
 * DigitalOcean API Client Service
 * 
 * Handles all communication with DigitalOcean API for droplet provisioning.
 * 
 * Environment variables required:
 * - DIGITALOCEAN_API_TOKEN: API token for authentication
 * - DIGITALOCEAN_DEFAULT_REGION: Default region (e.g., 'sgp1')
 */
@Injectable()
export class DigitalOceanClientService {
  private readonly logger = new Logger(DigitalOceanClientService.name);
  private readonly client: AxiosInstance;
  private readonly defaultRegion: string;

  constructor(private readonly configService: ConfigService) {
    const apiToken = this.configService.get<string>('DIGITALOCEAN_API_TOKEN');
    this.defaultRegion = this.configService.get<string>(
      'DIGITALOCEAN_DEFAULT_REGION',
      'sgp1'
    );

    this.client = axios.create({
      baseURL: 'https://api.digitalocean.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
    });
  }

  /**
   * Create a new droplet
   * 
   * POST /v2/droplets
   * 
   * @param config Droplet configuration
   * @returns Created droplet response
   */
  async createDroplet(config: CreateDropletConfig): Promise<DropletResponse> {
    this.logger.log(`Creating droplet: ${config.name} in ${config.region}`);

    try {
      const response = await this.client.post<CreateDropletResponse>(
        '/v2/droplets',
        {
          name: config.name,
          region: config.region || this.defaultRegion,
          size: config.size,
          image: config.image,
          tags: config.tags || [],
          ssh_keys: config.ssh_keys || [],
          backups: config.backups || false,
          ipv6: config.ipv6 || false,
          monitoring: config.monitoring || true,
        }
      );

      this.logger.log(
        `Droplet created: ID=${response.data.droplet.id}, Status=${response.data.droplet.status}`
      );

      return response.data.droplet;
    } catch (error) {
      this.handleApiError(error, 'createDroplet', { name: config.name });
    }
  }

  /**
   * Get droplet by ID
   * 
   * GET /v2/droplets/{droplet_id}
   * 
   * @param dropletId Droplet ID
   * @returns Droplet details
   */
  async getDroplet(dropletId: string): Promise<DropletResponse> {
    this.logger.debug(`Fetching droplet: ${dropletId}`);

    try {
      const response = await this.client.get<GetDropletResponse>(
        `/v2/droplets/${dropletId}`
      );

      return response.data.droplet;
    } catch (error) {
      this.handleApiError(error, 'getDroplet', { dropletId });
    }
  }

  /**
   * Extract public IPv4 address from droplet networks
   */
  extractPublicIpv4(droplet: DropletResponse): string | null {
    const publicNetwork = droplet.networks?.v4?.find(
      (n) => n.type === 'public'
    );
    return publicNetwork?.ip_address || null;
  }

  /**
   * Extract private IPv4 address from droplet networks
   */
  extractPrivateIpv4(droplet: DropletResponse): string | null {
    const privateNetwork = droplet.networks?.v4?.find(
      (n) => n.type === 'private'
    );
    return privateNetwork?.ip_address || null;
  }

  /**
   * Handle API errors and convert to custom exceptions
   */
  private handleApiError(
    error: unknown,
    method: string,
    context: Record<string, unknown>
  ): never {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      this.logger.error(
        `DigitalOcean API error in ${method}: ${status} - ${message}`,
        { context, responseData: error.response?.data }
      );

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new DigitalOceanUnavailableException({
          method,
          ...context,
          errorCode: error.code,
        });
      }

      // Map specific DO errors
      if (status === 401) {
        throw new DigitalOceanUnavailableException({
          method,
          ...context,
          errorCode: 'UNAUTHORIZED',
          message: 'Invalid API token',
        });
      }

      if (status === 404) {
        throw new DigitalOceanUnavailableException({
          method,
          ...context,
          errorCode: 'NOT_FOUND',
          message: 'Droplet not found',
        });
      }

      if (status === 422) {
        throw new DigitalOceanUnavailableException({
          method,
          ...context,
          errorCode: 'UNPROCESSABLE_ENTITY',
          message: message || 'Invalid droplet configuration',
        });
      }

      throw new DigitalOceanUnavailableException({
        method,
        ...context,
        errorCode: `HTTP_${status}`,
        message,
      });
    }

    this.logger.error(`Unexpected error in ${method}:`, error);
    throw new DigitalOceanUnavailableException({
      method,
      ...context,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
