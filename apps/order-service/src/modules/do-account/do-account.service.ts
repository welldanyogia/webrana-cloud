import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DoAccount } from '@prisma/client';

import { EncryptionService } from '../../common/services/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';

import { DoApiClient } from './do-api.client';
import {
  CreateDoAccountDto,
  UpdateDoAccountDto,
  DoAccountResponseDto,
  DoAccountStatsDto,
} from './dto';


// AccountHealth enum - matches Prisma schema
// Note: Once Prisma client is regenerated, this can be imported from '@prisma/client'
export const AccountHealth = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  UNHEALTHY: 'UNHEALTHY',
  UNKNOWN: 'UNKNOWN',
} as const;

export type AccountHealthType = (typeof AccountHealth)[keyof typeof AccountHealth];
import {
  NoAvailableAccountException,
  AllAccountsFullException,
} from './do-account.exceptions';

/**
 * Selection strategies for choosing a DO account
 */
export enum AccountSelectionStrategy {
  /** Default: account with fewest droplets (load balancing) */
  LEAST_USED = 'least_used',
  /** Rotate through accounts sequentially */
  ROUND_ROBIN = 'round_robin',
  /** Random selection among available accounts */
  RANDOM = 'random',
  /** Always try primary account first */
  PRIMARY_FIRST = 'primary_first',
}

/**
 * Account capacity information
 */
export interface AccountCapacity {
  dropletLimit: number;
  activeCount: number;
  availableCapacity: number;
}

/**
 * Service for managing DigitalOcean accounts
 *
 * Handles CRUD operations, account selection for provisioning,
 * health checks, and synchronization with DO API.
 */
@Injectable()
export class DoAccountService {
  private readonly logger = new Logger(DoAccountService.name);
  private lastRoundRobinIndex = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService
  ) {}

  // ===========================================
  // CRUD Operations
  // ===========================================

  /**
   * Create a new DO account
   * Token is encrypted before storage
   */
  async create(dto: CreateDoAccountDto): Promise<DoAccountResponseDto> {
    this.logger.log(`Creating DO account: ${dto.name}`);

    // Validate token with DO API before saving
    const client = new DoApiClient(dto.accessToken);
    const isValid = await client.validateToken();

    if (!isValid) {
      throw new BadRequestException({
        code: 'INVALID_TOKEN',
        message: 'DigitalOcean API token tidak valid',
      });
    }

    // Get account info from DO
    const accountInfo = await client.getAccountInfo();
    const dropletCount = await client.getDropletCount();

    // Encrypt the token
    const encryptedToken = this.encryptionService.encrypt(dto.accessToken);

    // If this is set as primary, unset other primary accounts
    if (dto.isPrimary) {
      await this.prisma.doAccount.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const account = await this.prisma.doAccount.create({
      data: {
        name: dto.name,
        email: dto.email || accountInfo.email,
        accessToken: encryptedToken,
        dropletLimit: accountInfo.dropletLimit,
        activeDroplets: dropletCount,
        isActive: dto.isActive ?? true,
        isPrimary: dto.isPrimary ?? false,
        healthStatus: AccountHealth.HEALTHY,
        lastHealthCheck: new Date(),
      },
    });

    this.logger.log(`DO account created: ${account.id}`);

    return this.mapToResponse(account);
  }

  /**
   * Get all DO accounts
   */
  async findAll(): Promise<DoAccountResponseDto[]> {
    const accounts = await this.prisma.doAccount.findMany({
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });

    return accounts.map((account) => this.mapToResponse(account));
  }

  /**
   * Get DO account by ID
   */
  async findById(id: string): Promise<DoAccountResponseDto> {
    const account = await this.prisma.doAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException({
        code: 'DO_ACCOUNT_NOT_FOUND',
        message: 'DO account tidak ditemukan',
        details: { id },
      });
    }

    return this.mapToResponse(account);
  }

  /**
   * Update DO account
   * If accessToken is provided, it will be validated and re-encrypted
   */
  async update(
    id: string,
    dto: UpdateDoAccountDto
  ): Promise<DoAccountResponseDto> {
    const existing = await this.prisma.doAccount.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'DO_ACCOUNT_NOT_FOUND',
        message: 'DO account tidak ditemukan',
        details: { id },
      });
    }

    const updateData: Partial<DoAccount> = {};

    // Update basic fields
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Handle token update
    if (dto.accessToken) {
      // Validate new token
      const client = new DoApiClient(dto.accessToken);
      const isValid = await client.validateToken();

      if (!isValid) {
        throw new BadRequestException({
          code: 'INVALID_TOKEN',
          message: 'DigitalOcean API token tidak valid',
        });
      }

      updateData.accessToken = this.encryptionService.encrypt(dto.accessToken);

      // Sync account info with new token
      const accountInfo = await client.getAccountInfo();
      const dropletCount = await client.getDropletCount();

      updateData.dropletLimit = accountInfo.dropletLimit;
      updateData.activeDroplets = dropletCount;
      updateData.healthStatus = AccountHealth.HEALTHY;
      updateData.lastHealthCheck = new Date();
    }

    // Handle primary flag
    if (dto.isPrimary === true && !existing.isPrimary) {
      // Unset other primary accounts
      await this.prisma.doAccount.updateMany({
        where: { isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
      updateData.isPrimary = true;
    } else if (dto.isPrimary === false) {
      updateData.isPrimary = false;
    }

    const account = await this.prisma.doAccount.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`DO account updated: ${id}`);

    return this.mapToResponse(account);
  }

  /**
   * Delete DO account
   * Note: Accounts with active provisioning tasks cannot be deleted
   */
  async delete(id: string): Promise<void> {
    const account = await this.prisma.doAccount.findUnique({
      where: { id },
      include: {
        provisioningTasks: {
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException({
        code: 'DO_ACCOUNT_NOT_FOUND',
        message: 'DO account tidak ditemukan',
        details: { id },
      });
    }

    if (account.provisioningTasks.length > 0) {
      throw new BadRequestException({
        code: 'ACCOUNT_HAS_ACTIVE_TASKS',
        message: 'Cannot delete account with active provisioning tasks',
        details: { activeTaskCount: account.provisioningTasks.length },
      });
    }

    await this.prisma.doAccount.delete({ where: { id } });

    this.logger.log(`DO account deleted: ${id}`);
  }

  // ===========================================
  // Core Operations
  // ===========================================

  /**
   * Select an available account for provisioning
   * 
   * Selection process:
   * 1. Get all active accounts with HEALTHY or UNKNOWN status
   * 2. Order by strategy (default: least used first)
   * 3. Check real-time capacity from DO API
   * 4. Return first account with available capacity
   *
   * @param strategy - Selection strategy (default: LEAST_USED)
   * @returns Account with decrypted token
   * @throws NoAvailableAccountException if no accounts configured
   * @throws AllAccountsFullException if all accounts at capacity
   */
  async selectAvailableAccount(
    strategy: AccountSelectionStrategy = AccountSelectionStrategy.LEAST_USED
  ): Promise<DoAccount & { decryptedToken: string }> {
    this.logger.log(`Selecting available account with strategy: ${strategy}`);

    // 1. Get all active accounts with healthy status
    const accounts = await this.getActiveAccounts(strategy);

    if (accounts.length === 0) {
      this.logger.error('No active DO accounts configured');
      throw new NoAvailableAccountException();
    }

    this.logger.debug(`Found ${accounts.length} active accounts to check`);

    // 2. Find first account with available capacity (real-time check)
    for (const account of accounts) {
      try {
        // Get real-time capacity from DO API
        const capacity = await this.getAccountCapacity(account.id);

        // Update cached values
        await this.prisma.doAccount.update({
          where: { id: account.id },
          data: {
            dropletLimit: capacity.dropletLimit,
            activeDroplets: capacity.activeCount,
            lastHealthCheck: new Date(),
            healthStatus: AccountHealth.HEALTHY,
          },
        });

        // Check if has capacity
        if (capacity.activeCount < capacity.dropletLimit) {
          this.logger.log(
            `Selected account ${account.id} (${account.name}): ${capacity.activeCount}/${capacity.dropletLimit} droplets`
          );

          const decryptedToken = this.encryptionService.decrypt(account.accessToken);
          
          return {
            ...account,
            dropletLimit: capacity.dropletLimit,
            activeDroplets: capacity.activeCount,
            decryptedToken,
          };
        }

        this.logger.debug(
          `Account ${account.id} is full: ${capacity.activeCount}/${capacity.dropletLimit}`
        );
      } catch (error) {
        // Mark account as unhealthy and continue to next
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.markAccountUnhealthy(account.id, errorMessage);
        continue;
      }
    }

    // 3. All accounts full
    this.logger.error('All DO accounts have reached their droplet limit');
    throw new AllAccountsFullException();
  }

  /**
   * Get real-time account capacity from DigitalOcean API
   * 
   * @param accountId - DO account ID
   * @returns Account capacity info
   */
  async getAccountCapacity(accountId: string): Promise<AccountCapacity> {
    const account = await this.prisma.doAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException({
        code: 'DO_ACCOUNT_NOT_FOUND',
        message: 'DO account tidak ditemukan',
        details: { accountId },
      });
    }

    const decryptedToken = this.encryptionService.decrypt(account.accessToken);
    const client = new DoApiClient(decryptedToken);

    const accountInfo = await client.getAccountInfo();
    const dropletCount = await client.getDropletCount();

    return {
      dropletLimit: accountInfo.dropletLimit,
      activeCount: dropletCount,
      availableCapacity: accountInfo.dropletLimit - dropletCount,
    };
  }

  /**
   * Mark an account as unhealthy
   * 
   * @param accountId - DO account ID
   * @param reason - Reason for marking unhealthy
   */
  async markAccountUnhealthy(accountId: string, reason: string): Promise<void> {
    await this.prisma.doAccount.update({
      where: { id: accountId },
      data: {
        healthStatus: AccountHealth.UNHEALTHY,
        lastHealthCheck: new Date(),
      },
    });

    this.logger.warn(`DO Account ${accountId} marked unhealthy: ${reason}`);
  }

  /**
   * Mark an account as healthy
   * 
   * @param accountId - DO account ID
   */
  async markAccountHealthy(accountId: string): Promise<void> {
    await this.prisma.doAccount.update({
      where: { id: accountId },
      data: {
        healthStatus: AccountHealth.HEALTHY,
        lastHealthCheck: new Date(),
      },
    });

    this.logger.log(`DO Account ${accountId} marked healthy`);
  }

  /**
   * Get active accounts ordered by selection strategy
   * 
   * @private
   */
  private async getActiveAccounts(
    strategy: AccountSelectionStrategy
  ): Promise<DoAccount[]> {
    // Base query for active and healthy/unknown accounts
    const accounts = await this.prisma.doAccount.findMany({
      where: {
        isActive: true,
        healthStatus: {
          in: [AccountHealth.HEALTHY, AccountHealth.UNKNOWN],
        },
      },
      orderBy: this.getOrderByForStrategy(strategy),
    });

    // Apply strategy-specific reordering if needed
    return this.applyStrategyReordering(accounts, strategy);
  }

  /**
   * Get Prisma orderBy based on strategy
   * 
   * @private
   */
  private getOrderByForStrategy(
    strategy: AccountSelectionStrategy
  ): { isPrimary?: 'asc' | 'desc'; activeDroplets?: 'asc' | 'desc' }[] {
    switch (strategy) {
      case AccountSelectionStrategy.PRIMARY_FIRST:
        return [{ isPrimary: 'desc' }, { activeDroplets: 'asc' }];
      case AccountSelectionStrategy.LEAST_USED:
      default:
        return [{ isPrimary: 'desc' }, { activeDroplets: 'asc' }];
    }
  }

  /**
   * Apply strategy-specific reordering
   * 
   * @private
   */
  private applyStrategyReordering(
    accounts: DoAccount[],
    strategy: AccountSelectionStrategy
  ): DoAccount[] {
    if (accounts.length === 0) return accounts;

    switch (strategy) {
      case AccountSelectionStrategy.ROUND_ROBIN:
        // Rotate array starting from last used index
        this.lastRoundRobinIndex =
          (this.lastRoundRobinIndex + 1) % accounts.length;
        return [
          ...accounts.slice(this.lastRoundRobinIndex),
          ...accounts.slice(0, this.lastRoundRobinIndex),
        ];

      case AccountSelectionStrategy.RANDOM:
        // Fisher-Yates shuffle
        const shuffled = [...accounts];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;

      default:
        return accounts;
    }
  }

  /**
   * Get decrypted token for a specific account
   */
  async getDecryptedToken(accountId: string): Promise<string> {
    const account = await this.prisma.doAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException({
        code: 'DO_ACCOUNT_NOT_FOUND',
        message: 'DO account tidak ditemukan',
        details: { accountId },
      });
    }

    return this.encryptionService.decrypt(account.accessToken);
  }

  /**
   * Get console URL for a droplet via DigitalOcean API
   * 
   * @param accountId - DO account ID that owns the droplet
   * @param dropletId - Droplet ID
   * @returns Console URL and expiry time
   */
  async getDropletConsoleUrl(
    accountId: string,
    dropletId: string
  ): Promise<{ url: string; expiresAt: string }> {
    const token = await this.getDecryptedToken(accountId);
    const client = new DoApiClient(token);

    const response = await client.getDropletConsole(parseInt(dropletId));

    // Console URLs typically expire in ~10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return {
      url: response.console.url,
      expiresAt,
    };
  }

  /**
   * Perform power action on a droplet
   * 
   * @param accountId - DO account ID that owns the droplet
   * @param dropletId - Droplet ID
   * @param action - Power action to perform
   */
  async performDropletPowerAction(
    accountId: string,
    dropletId: string,
    action: 'power_on' | 'power_off' | 'reboot'
  ): Promise<void> {
    const token = await this.getDecryptedToken(accountId);
    const client = new DoApiClient(token);

    await client.performDropletAction(parseInt(dropletId), action);

    this.logger.log(`Power action ${action} performed on droplet ${dropletId}`);
  }

  // ===========================================
  // Sync & Health Operations
  // ===========================================

  /**
   * Sync account limits and droplet count from DO API
   */
  async syncAccountLimits(accountId: string): Promise<DoAccountResponseDto> {
    const account = await this.prisma.doAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException({
        code: 'DO_ACCOUNT_NOT_FOUND',
        message: 'DO account tidak ditemukan',
        details: { accountId },
      });
    }

    const decryptedToken = this.encryptionService.decrypt(account.accessToken);
    const client = new DoApiClient(decryptedToken);

    try {
      const accountInfo = await client.getAccountInfo();
      const dropletCount = await client.getDropletCount();

      const updated = await this.prisma.doAccount.update({
        where: { id: accountId },
        data: {
          dropletLimit: accountInfo.dropletLimit,
          activeDroplets: dropletCount,
          healthStatus: AccountHealth.HEALTHY,
          lastHealthCheck: new Date(),
        },
      });

      this.logger.log(`Synced DO account: ${accountId}`);

      return this.mapToResponse(updated);
    } catch (error) {
      // Update health status on failure
      await this.prisma.doAccount.update({
        where: { id: accountId },
        data: {
          healthStatus: AccountHealth.UNHEALTHY,
          lastHealthCheck: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Sync all active accounts
   */
  async syncAllAccounts(): Promise<{
    synced: number;
    failed: number;
    errors: Array<{ accountId: string; error: string }>;
  }> {
    const accounts = await this.prisma.doAccount.findMany({
      where: { isActive: true },
    });

    let synced = 0;
    let failed = 0;
    const errors: Array<{ accountId: string; error: string }> = [];

    for (const account of accounts) {
      try {
        await this.syncAccountLimits(account.id);
        synced++;
      } catch (error) {
        failed++;
        errors.push({
          accountId: account.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.logger.error(`Failed to sync account ${account.id}:`, error);
      }
    }

    this.logger.log(`Sync complete: ${synced} synced, ${failed} failed`);

    return { synced, failed, errors };
  }

  /**
   * Perform health check on a single account
   */
  async healthCheck(accountId: string): Promise<AccountHealth> {
    const account = await this.prisma.doAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException({
        code: 'DO_ACCOUNT_NOT_FOUND',
        message: 'DO account tidak ditemukan',
        details: { accountId },
      });
    }

    const decryptedToken = this.encryptionService.decrypt(account.accessToken);
    const client = new DoApiClient(decryptedToken);

    let healthStatus: AccountHealth;

    try {
      const isValid = await client.validateToken();

      if (!isValid) {
        healthStatus = AccountHealth.UNHEALTHY;
      } else {
        // Check rate limits
        const rateLimit = await client.getRateLimitInfo();

        if (rateLimit && rateLimit.remaining < 100) {
          healthStatus = AccountHealth.DEGRADED;
        } else {
          healthStatus = AccountHealth.HEALTHY;
        }
      }
    } catch {
      healthStatus = AccountHealth.UNHEALTHY;
    }

    await this.prisma.doAccount.update({
      where: { id: accountId },
      data: {
        healthStatus,
        lastHealthCheck: new Date(),
      },
    });

    return healthStatus;
  }

  /**
   * Increment active droplet count for an account
   */
  async incrementActiveCount(accountId: string): Promise<void> {
    await this.prisma.doAccount.update({
      where: { id: accountId },
      data: {
        activeDroplets: { increment: 1 },
      },
    });

    this.logger.debug(`Incremented active count for account ${accountId}`);
  }

  /**
   * Decrement active droplet count for an account
   */
  async decrementActiveCount(accountId: string): Promise<void> {
    const account = await this.prisma.doAccount.findUnique({
      where: { id: accountId },
    });

    if (account && account.activeDroplets > 0) {
      await this.prisma.doAccount.update({
        where: { id: accountId },
        data: {
          activeDroplets: { decrement: 1 },
        },
      });

      this.logger.debug(`Decremented active count for account ${accountId}`);
    }
  }

  // ===========================================
  // Statistics
  // ===========================================

  /**
   * Get overall statistics for all accounts
   */
  async getStats(): Promise<DoAccountStatsDto> {
    const accounts = await this.prisma.doAccount.findMany();

    const activeAccounts = accounts.filter((a) => a.isActive);
    const healthyAccounts = accounts.filter(
      (a) => a.isActive && a.healthStatus === AccountHealth.HEALTHY
    );

    const totalDropletLimit = activeAccounts.reduce(
      (sum, a) => sum + a.dropletLimit,
      0
    );
    const totalActiveDroplets = activeAccounts.reduce(
      (sum, a) => sum + a.activeDroplets,
      0
    );

    return {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      healthyAccounts: healthyAccounts.length,
      totalDropletLimit,
      totalActiveDroplets,
      totalAvailableCapacity: totalDropletLimit - totalActiveDroplets,
    };
  }

  /**
   * Get overall statistics for all accounts (extended stats for scheduler)
   * Includes unhealthy accounts, full accounts, and utilization percentage
   */
  async getOverallStats(): Promise<{
    totalAccounts: number;
    activeAccounts: number;
    healthyAccounts: number;
    unhealthyAccounts: number;
    fullAccounts: number;
    totalDropletLimit: number;
    totalActiveDroplets: number;
    utilizationPercent: number;
  }> {
    const accounts = await this.prisma.doAccount.findMany();

    const stats = accounts.reduce(
      (acc, account) => {
        acc.totalAccounts++;
        if (account.isActive) acc.activeAccounts++;
        if (account.healthStatus === AccountHealth.HEALTHY) acc.healthyAccounts++;
        if (account.healthStatus === AccountHealth.UNHEALTHY) acc.unhealthyAccounts++;
        if (account.activeDroplets >= account.dropletLimit) acc.fullAccounts++;
        acc.totalDropletLimit += account.dropletLimit;
        acc.totalActiveDroplets += account.activeDroplets;
        return acc;
      },
      {
        totalAccounts: 0,
        activeAccounts: 0,
        healthyAccounts: 0,
        unhealthyAccounts: 0,
        fullAccounts: 0,
        totalDropletLimit: 0,
        totalActiveDroplets: 0,
        utilizationPercent: 0,
      }
    );

    stats.utilizationPercent =
      stats.totalDropletLimit > 0
        ? (stats.totalActiveDroplets / stats.totalDropletLimit) * 100
        : 0;

    return stats;
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  /**
   * Map DoAccount entity to response DTO (excludes sensitive data)
   */
  private mapToResponse(account: DoAccount): DoAccountResponseDto {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      dropletLimit: account.dropletLimit,
      activeDroplets: account.activeDroplets,
      availableCapacity: account.dropletLimit - account.activeDroplets,
      isActive: account.isActive,
      isPrimary: account.isPrimary,
      healthStatus: account.healthStatus,
      lastHealthCheck: account.lastHealthCheck,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}
