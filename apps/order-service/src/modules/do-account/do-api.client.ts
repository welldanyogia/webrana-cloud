import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Configuration for creating a new droplet
 */
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

/**
 * Droplet network information
 */
export interface DropletNetwork {
  ip_address: string;
  netmask: string;
  gateway: string;
  type: 'public' | 'private';
}

/**
 * Droplet response from DigitalOcean API
 */
export interface Droplet {
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

/**
 * Droplet action response
 */
export interface DropletAction {
  id: number;
  status: 'in-progress' | 'completed' | 'errored';
  type: string;
  started_at: string;
  completed_at: string | null;
  resource_id: number;
  resource_type: string;
}

/**
 * DigitalOcean Size (Droplet plan)
 */
export interface DoSize {
  slug: string;
  memory: number;
  vcpus: number;
  disk: number;
  transfer: number;
  price_monthly: number;
  price_hourly: number;
  regions: string[];
  available: boolean;
  description: string;
}

/**
 * DigitalOcean Region
 */
export interface DoRegion {
  slug: string;
  name: string;
  sizes: string[];
  available: boolean;
  features: string[];
}

/**
 * DigitalOcean Image (OS)
 */
export interface DoImage {
  id: number;
  name: string;
  distribution: string;
  slug: string | null;
  public: boolean;
  regions: string[];
  created_at: string;
  min_disk_size: number;
  type: string;
  size_gigabytes: number;
  description: string | null;
  tags: string[];
  status: string;
}

/**
 * DigitalOcean API Client for account and droplet management operations
 *
 * Supports:
 * - Account info and token validation
 * - Droplet count
 * - Droplet CRUD operations (create, get, delete)
 * - Droplet actions (reboot, power on/off)
 */
export class DoApiClient {
  private readonly logger = new Logger(DoApiClient.name);
  private readonly client: AxiosInstance;

  constructor(accessToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.digitalocean.com/v2',
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get account information from DigitalOcean
   *
   * @returns Account info including droplet limit and email
   */
  async getAccountInfo(): Promise<{
    dropletLimit: number;
    email: string;
    status: string;
    uuid: string;
  }> {
    try {
      const response = await this.client.get('/account');
      const account = response.data.account;

      return {
        dropletLimit: account.droplet_limit,
        email: account.email,
        status: account.status,
        uuid: account.uuid,
      };
    } catch (error) {
      this.handleApiError(error, 'getAccountInfo');
    }
  }

  /**
   * Get total droplet count for the account
   *
   * @returns Number of active droplets
   */
  async getDropletCount(): Promise<number> {
    try {
      const response = await this.client.get('/droplets', {
        params: { per_page: 1 },
      });
      return response.data.meta?.total || 0;
    } catch (error) {
      this.handleApiError(error, 'getDropletCount');
    }
  }

  /**
   * Validate the access token by making a test API call
   *
   * @returns true if token is valid, false otherwise
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.client.get('/account');
      return true;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        return false;
      }
      // For other errors (network, timeout), re-throw
      throw error;
    }
  }

  /**
   * Get rate limit information from DigitalOcean
   *
   * @returns Rate limit info
   */
  async getRateLimitInfo(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
  } | null> {
    try {
      const response = await this.client.get('/account');
      const headers = response.headers;

      return {
        limit: parseInt(headers['ratelimit-limit'] || '0', 10),
        remaining: parseInt(headers['ratelimit-remaining'] || '0', 10),
        reset: new Date(parseInt(headers['ratelimit-reset'] || '0', 10) * 1000),
      };
    } catch {
      return null;
    }
  }

  // ===========================================
  // Droplet Operations
  // ===========================================

  /**
   * Create a new droplet
   *
   * @param config Droplet configuration
   * @returns Created droplet response
   */
  async createDroplet(config: CreateDropletConfig): Promise<Droplet> {
    this.logger.log(`Creating droplet: ${config.name} in ${config.region}`);

    try {
      const response = await this.client.post('/droplets', {
        name: config.name,
        region: config.region,
        size: config.size,
        image: config.image,
        tags: config.tags || [],
        ssh_keys: config.ssh_keys || [],
        backups: config.backups || false,
        ipv6: config.ipv6 || false,
        monitoring: config.monitoring || true,
      });

      const droplet = response.data.droplet;
      this.logger.log(`Droplet created: ID=${droplet.id}, Status=${droplet.status}`);

      return droplet;
    } catch (error) {
      this.handleApiError(error, 'createDroplet');
    }
  }

  /**
   * Get droplet by ID
   *
   * @param dropletId Droplet ID
   * @returns Droplet details
   */
  async getDroplet(dropletId: number): Promise<Droplet> {
    this.logger.debug(`Fetching droplet: ${dropletId}`);

    try {
      const response = await this.client.get(`/droplets/${dropletId}`);
      return response.data.droplet;
    } catch (error) {
      this.handleApiError(error, 'getDroplet');
    }
  }

  /**
   * Delete a droplet
   *
   * @param dropletId Droplet ID
   */
  async deleteDroplet(dropletId: number): Promise<void> {
    this.logger.log(`Deleting droplet: ${dropletId}`);

    try {
      await this.client.delete(`/droplets/${dropletId}`);
      this.logger.log(`Droplet ${dropletId} deleted`);
    } catch (error) {
      this.handleApiError(error, 'deleteDroplet');
    }
  }

  /**
   * Perform an action on a droplet
   *
   * @param dropletId Droplet ID
   * @param action Action type
   * @returns Action response
   */
  async performDropletAction(
    dropletId: number,
    action: 'reboot' | 'power_off' | 'power_on' | 'password_reset'
  ): Promise<DropletAction> {
    this.logger.log(`Performing action ${action} on droplet ${dropletId}`);

    try {
      const response = await this.client.post(`/droplets/${dropletId}/actions`, {
        type: action,
      });

      const actionResult = response.data.action;
      this.logger.log(`Action triggered: ID=${actionResult.id}, Status=${actionResult.status}`);

      return actionResult;
    } catch (error) {
      this.handleApiError(error, 'performDropletAction');
    }
  }

  /**
   * Extract public IPv4 address from droplet
   */
  extractPublicIpv4(droplet: Droplet): string | null {
    const publicNetwork = droplet.networks?.v4?.find((n) => n.type === 'public');
    return publicNetwork?.ip_address || null;
  }

  /**
   * Extract private IPv4 address from droplet
   */
  extractPrivateIpv4(droplet: Droplet): string | null {
    const privateNetwork = droplet.networks?.v4?.find((n) => n.type === 'private');
    return privateNetwork?.ip_address || null;
  }

  /**
   * Get console URL for a droplet
   * This provides web-based VNC console access
   *
   * @param dropletId Droplet ID
   * @returns Console URL response
   */
  async getDropletConsole(dropletId: number): Promise<{ console: { url: string } }> {
    this.logger.log(`Getting console URL for droplet: ${dropletId}`);

    try {
      const response = await this.client.post(`/droplets/${dropletId}/console`);
      const consoleData = response.data.console;

      this.logger.log(`Console URL obtained for droplet ${dropletId}`);

      return { console: { url: consoleData.url } };
    } catch (error) {
      this.handleApiError(error, 'getDropletConsole');
    }
  }

  // ===========================================
  // Catalog Operations (Sizes, Regions, Images)
  // ===========================================

  /**
   * Get all available droplet sizes from DigitalOcean
   * @returns List of available sizes with pricing and specs
   */
  async getSizes(): Promise<DoSize[]> {
    this.logger.log('Fetching available DO sizes');

    try {
      const sizes: DoSize[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get('/sizes', {
          params: { per_page: 100, page },
        });

        sizes.push(...response.data.sizes);

        const total = response.data.meta?.total || 0;
        hasMore = sizes.length < total;
        page++;
      }

      this.logger.log(`Fetched ${sizes.length} DO sizes`);
      return sizes.filter((s) => s.available);
    } catch (error) {
      this.handleApiError(error, 'getSizes');
    }
  }

  /**
   * Get all available regions from DigitalOcean
   * @returns List of available regions
   */
  async getRegions(): Promise<DoRegion[]> {
    this.logger.log('Fetching available DO regions');

    try {
      const response = await this.client.get('/regions', {
        params: { per_page: 100 },
      });

      const regions = response.data.regions as DoRegion[];
      this.logger.log(`Fetched ${regions.length} DO regions`);

      return regions.filter((r) => r.available);
    } catch (error) {
      this.handleApiError(error, 'getRegions');
    }
  }

  /**
   * Get all available distribution images (OS) from DigitalOcean
   * @returns List of available OS images
   */
  async getImages(): Promise<DoImage[]> {
    this.logger.log('Fetching available DO images');

    try {
      const images: DoImage[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get('/images', {
          params: { type: 'distribution', per_page: 100, page },
        });

        images.push(...response.data.images);

        const total = response.data.meta?.total || 0;
        hasMore = images.length < total;
        page++;
      }

      this.logger.log(`Fetched ${images.length} DO images`);
      return images.filter((i) => i.status === 'available');
    } catch (error) {
      this.handleApiError(error, 'getImages');
    }
  }

  /**
   * Get regions available for a specific size
   * @param sizeSlug The size slug to check
   * @returns List of regions where this size is available
   */
  async getRegionsForSize(sizeSlug: string): Promise<DoRegion[]> {
    const [sizes, regions] = await Promise.all([
      this.getSizes(),
      this.getRegions(),
    ]);

    const size = sizes.find((s) => s.slug === sizeSlug);
    if (!size) {
      throw new Error(`Size ${sizeSlug} not found`);
    }

    return regions.filter((r) => size.regions.includes(r.slug));
  }

  /**
   * Get images available for a specific region
   * @param regionSlug The region slug to check
   * @returns List of images available in this region
   */
  async getImagesForRegion(regionSlug: string): Promise<DoImage[]> {
    const images = await this.getImages();
    return images.filter((i) => i.regions.includes(regionSlug));
  }

  // ===========================================
  // Error Handling
  // ===========================================

  /**
   * Handle API errors and convert to appropriate exceptions
   */
  private handleApiError(error: unknown, method: string): never {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message =
        error.response?.data?.message || error.response?.data?.id || error.message;

      this.logger.error(`DO API error in ${method}: ${status} - ${message}`);

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error(`DigitalOcean API unavailable: ${error.code}`);
      }

      if (status === 401) {
        throw new Error('Invalid DigitalOcean API token');
      }

      if (status === 429) {
        throw new Error('DigitalOcean API rate limit exceeded');
      }

      throw new Error(`DigitalOcean API error: ${message}`);
    }

    this.logger.error(`Unexpected error in ${method}:`, error);
    throw new Error(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}
