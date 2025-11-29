import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { DigitalOceanApiException } from '../../common/exceptions';

// DigitalOcean API Types
export interface DropletNetwork {
  ip_address: string;
  netmask: string;
  gateway: string;
  type: 'public' | 'private';
}

export interface DropletResponse {
  id: number;
  name: string;
  status: 'new' | 'active' | 'off' | 'archive';
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
    distribution: string;
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

export interface DropletActionResponse {
  id: number;
  status: 'in-progress' | 'completed' | 'errored';
  type: string;
  started_at: string;
  completed_at: string | null;
  resource_id: number;
  resource_type: string;
  region: {
    slug: string;
    name: string;
  };
}

export interface GetDropletResponse {
  droplet: DropletResponse;
}

export interface DropletActionApiResponse {
  action: DropletActionResponse;
}

export type DropletActionType = 'reboot' | 'power_off' | 'power_on' | 'password_reset';

/**
 * DigitalOcean API Client Service for Instance Management
 * 
 * Handles droplet actions: reboot, power on/off, password reset.
 * 
 * Environment variables required:
 * - DIGITALOCEAN_API_TOKEN: API token for authentication
 */
@Injectable()
export class DigitalOceanService {
  private readonly logger = new Logger(DigitalOceanService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiToken = this.configService.get<string>('DIGITALOCEAN_API_TOKEN');

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
   * Get droplet by ID
   * 
   * GET /v2/droplets/{droplet_id}
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
   * Trigger an action on a droplet
   * 
   * POST /v2/droplets/{droplet_id}/actions
   * 
   * @param dropletId Droplet ID
   * @param actionType Type of action: reboot, power_off, power_on, password_reset
   * @returns Action response with status
   */
  async triggerAction(
    dropletId: string,
    actionType: DropletActionType
  ): Promise<DropletActionResponse> {
    this.logger.log(`Triggering action ${actionType} on droplet ${dropletId}`);

    try {
      const response = await this.client.post<DropletActionApiResponse>(
        `/v2/droplets/${dropletId}/actions`,
        { type: actionType }
      );

      this.logger.log(
        `Action triggered: ID=${response.data.action.id}, Status=${response.data.action.status}`
      );

      return response.data.action;
    } catch (error) {
      this.handleApiError(error, 'triggerAction', { dropletId, actionType });
    }
  }

  /**
   * Get action status
   * 
   * GET /v2/droplets/{droplet_id}/actions/{action_id}
   */
  async getActionStatus(
    dropletId: string,
    actionId: number
  ): Promise<DropletActionResponse> {
    this.logger.debug(`Fetching action status: droplet=${dropletId}, action=${actionId}`);

    try {
      const response = await this.client.get<DropletActionApiResponse>(
        `/v2/droplets/${dropletId}/actions/${actionId}`
      );

      return response.data.action;
    } catch (error) {
      this.handleApiError(error, 'getActionStatus', { dropletId, actionId });
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
        throw new DigitalOceanApiException({
          method,
          ...context,
          errorCode: error.code,
        });
      }

      // Map specific DO errors
      if (status === 401) {
        throw new DigitalOceanApiException({
          method,
          ...context,
          errorCode: 'UNAUTHORIZED',
          message: 'Invalid API token',
        });
      }

      if (status === 404) {
        throw new DigitalOceanApiException({
          method,
          ...context,
          errorCode: 'NOT_FOUND',
          message: 'Droplet or action not found',
        });
      }

      if (status === 422) {
        throw new DigitalOceanApiException({
          method,
          ...context,
          errorCode: 'UNPROCESSABLE_ENTITY',
          message: message || 'Invalid request',
        });
      }

      throw new DigitalOceanApiException({
        method,
        ...context,
        errorCode: `HTTP_${status}`,
        message,
      });
    }

    this.logger.error(`Unexpected error in ${method}:`, error);
    throw new DigitalOceanApiException({
      method,
      ...context,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
