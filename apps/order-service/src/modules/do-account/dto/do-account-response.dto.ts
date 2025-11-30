import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountHealth } from '@prisma/client';

/**
 * Response DTO for DigitalOcean account
 * Note: accessToken is NEVER included in responses
 */
export class DoAccountResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique identifier for the account',
  })
  id: string;

  @ApiProperty({
    example: 'Production DO Account',
    description: 'Display name for the account',
  })
  name: string;

  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email associated with the DO account',
  })
  email: string;

  @ApiProperty({
    example: 25,
    description: 'Maximum droplets allowed on this account',
  })
  dropletLimit: number;

  @ApiProperty({
    example: 10,
    description: 'Current number of active droplets',
  })
  activeDroplets: number;

  @ApiProperty({
    example: 15,
    description: 'Available capacity (dropletLimit - activeDroplets)',
  })
  availableCapacity: number;

  @ApiProperty({
    example: true,
    description: 'Whether the account is active for provisioning',
  })
  isActive: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether this is the primary account',
  })
  isPrimary: boolean;

  @ApiProperty({
    enum: AccountHealth,
    example: 'HEALTHY',
    description: 'Current health status of the account',
  })
  healthStatus: AccountHealth;

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00Z',
    description: 'Last health check timestamp',
  })
  lastHealthCheck?: Date | null;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Account creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Account last update timestamp',
  })
  updatedAt: Date;
}

/**
 * Response DTO for account statistics
 */
export class DoAccountStatsDto {
  @ApiProperty({
    example: 3,
    description: 'Total number of registered accounts',
  })
  totalAccounts: number;

  @ApiProperty({
    example: 2,
    description: 'Number of active accounts',
  })
  activeAccounts: number;

  @ApiProperty({
    example: 2,
    description: 'Number of healthy accounts',
  })
  healthyAccounts: number;

  @ApiProperty({
    example: 75,
    description: 'Total droplet limit across all accounts',
  })
  totalDropletLimit: number;

  @ApiProperty({
    example: 30,
    description: 'Total active droplets across all accounts',
  })
  totalActiveDroplets: number;

  @ApiProperty({
    example: 45,
    description: 'Total available capacity across all accounts',
  })
  totalAvailableCapacity: number;
}
