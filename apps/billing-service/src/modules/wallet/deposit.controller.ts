import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { DepositService } from './deposit.service';
import {
  CreateDepositDto,
  DepositResponseDto,
  DepositListResponseDto,
  DepositInitiatedResponseDto,
  ListDepositsQueryDto,
} from './dto/wallet.dto';

/**
 * Deposit Controller - User Deposit Operations
 * 
 * Base path: /api/v1/wallet/deposits
 * Authentication: JWT Bearer token required
 */
@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('api/v1/wallet/deposits')
@UseGuards(JwtAuthGuard)
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  /**
   * POST /api/v1/wallet/deposits
   * Create a new deposit (initiate payment)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create deposit' })
  @ApiResponse({ status: 201, description: 'Deposit created and payment initiated' })
  @ApiResponse({ status: 400, description: 'Invalid amount or payment method' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createDeposit(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDepositDto
  ): Promise<{ data: DepositInitiatedResponseDto }> {
    const result = await this.depositService.createDeposit(user.userId, dto);
    return { data: result };
  }

  /**
   * GET /api/v1/wallet/deposits
   * Get deposit history for current user
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get deposit history' })
  @ApiResponse({ status: 200, description: 'Returns paginated deposit list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeposits(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListDepositsQueryDto
  ): Promise<DepositListResponseDto> {
    return this.depositService.getDepositsByUserId(user.userId, query);
  }

  /**
   * GET /api/v1/wallet/deposits/:id
   * Get deposit detail by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get deposit detail' })
  @ApiResponse({ status: 200, description: 'Returns deposit detail' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  async getDepositById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') depositId: string
  ): Promise<{ data: DepositResponseDto }> {
    const deposit = await this.depositService.getDepositById(depositId, user.userId);
    return { data: deposit };
  }

  /**
   * DELETE /api/v1/wallet/deposits/:id
   * Cancel a pending deposit
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel pending deposit' })
  @ApiResponse({ status: 200, description: 'Deposit cancelled' })
  @ApiResponse({ status: 400, description: 'Deposit cannot be cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  async cancelDeposit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') depositId: string
  ): Promise<{ data: DepositResponseDto }> {
    const deposit = await this.depositService.cancelDeposit(depositId, user.userId);
    return { data: deposit };
  }
}
