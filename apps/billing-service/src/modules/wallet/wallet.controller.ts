import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import {
  ListTransactionsQueryDto,
  WalletResponseDto,
  WalletTransactionListResponseDto,
} from './dto/wallet.dto';
import { WalletService } from './wallet.service';

/**
 * Wallet Controller - User Wallet Operations
 * 
 * Base path: /api/v1/wallet
 * Authentication: JWT Bearer token required
 */
@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('api/v1/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /api/v1/wallet
   * Get current user's wallet balance
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Returns wallet information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWallet(@CurrentUser() user: CurrentUserPayload): Promise<{ data: WalletResponseDto }> {
    const wallet = await this.walletService.getWallet(user.userId);
    return { data: wallet };
  }

  /**
   * GET /api/v1/wallet/transactions
   * Get transaction history for current user
   */
  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({ status: 200, description: 'Returns paginated transaction list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTransactions(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListTransactionsQueryDto
  ): Promise<WalletTransactionListResponseDto> {
    return this.walletService.getTransactions(user.userId, query);
  }

  /**
   * GET /api/v1/wallet/balance
   * Get current balance (simplified endpoint)
   */
  @Get('balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get balance only' })
  @ApiResponse({ status: 200, description: 'Returns balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBalance(@CurrentUser() user: CurrentUserPayload): Promise<{ data: { balance: number } }> {
    const balance = await this.walletService.getBalance(user.userId);
    return { data: { balance } };
  }

  /**
   * GET /api/v1/wallet/check-balance
   * Check if user has sufficient balance for an amount
   */
  @Get('check-balance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check sufficient balance' })
  @ApiResponse({ status: 200, description: 'Returns if balance is sufficient' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkBalance(
    @CurrentUser() user: CurrentUserPayload,
    @Query('amount') amount: number
  ): Promise<{ data: { sufficient: boolean; balance: number; required: number } }> {
    const balance = await this.walletService.getBalance(user.userId);
    const sufficient = balance >= amount;
    return {
      data: {
        sufficient,
        balance,
        required: amount,
      },
    };
  }
}
