import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { DoAccountService } from './do-account.service';
import {
  CreateDoAccountDto,
  UpdateDoAccountDto,
  DoAccountResponseDto,
  DoAccountStatsDto,
} from './dto';
import { ApiKeyGuard } from '../../common/guards';

/**
 * Internal DO Account Controller
 *
 * Admin endpoints for managing DigitalOcean accounts.
 * All endpoints require API key authentication (X-API-Key header).
 */
@ApiTags('DO Accounts (Internal)')
@ApiHeader({
  name: 'X-API-Key',
  description: 'Internal API Key for authentication',
  required: true,
})
@Controller('internal/do-accounts')
@UseGuards(ApiKeyGuard)
export class DoAccountController {
  constructor(private readonly doAccountService: DoAccountService) {}

  /**
   * Create a new DO account
   *
   * POST /internal/do-accounts
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new DigitalOcean account' })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: DoAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or validation error',
  })
  async create(@Body() dto: CreateDoAccountDto) {
    const account = await this.doAccountService.create(dto);
    return { data: account };
  }

  /**
   * List all DO accounts
   *
   * GET /internal/do-accounts
   */
  @Get()
  @ApiOperation({ summary: 'List all DigitalOcean accounts' })
  @ApiResponse({
    status: 200,
    description: 'List of accounts',
    type: [DoAccountResponseDto],
  })
  async findAll() {
    const accounts = await this.doAccountService.findAll();
    return { data: accounts };
  }

  /**
   * Get overall account statistics
   *
   * GET /internal/do-accounts/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get overall account statistics' })
  @ApiResponse({
    status: 200,
    description: 'Account statistics',
    type: DoAccountStatsDto,
  })
  async getStats() {
    const stats = await this.doAccountService.getStats();
    return { data: stats };
  }

  /**
   * Sync all accounts with DO API
   *
   * POST /internal/do-accounts/sync-all
   */
  @Post('sync-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync all accounts with DigitalOcean API' })
  @ApiResponse({
    status: 200,
    description: 'Sync results',
  })
  async syncAll() {
    const result = await this.doAccountService.syncAllAccounts();
    return { data: result };
  }

  /**
   * Get DO account by ID
   *
   * GET /internal/do-accounts/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a DigitalOcean account by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Account details',
    type: DoAccountResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const account = await this.doAccountService.findById(id);
    return { data: account };
  }

  /**
   * Update DO account
   *
   * PATCH /internal/do-accounts/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a DigitalOcean account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Account updated successfully',
    type: DoAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDoAccountDto
  ) {
    const account = await this.doAccountService.update(id, dto);
    return { data: account };
  }

  /**
   * Delete DO account
   *
   * DELETE /internal/do-accounts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a DigitalOcean account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 204,
    description: 'Account deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete account with active provisioning tasks',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.doAccountService.delete(id);
  }

  /**
   * Sync single account with DO API
   *
   * POST /internal/do-accounts/:id/sync
   */
  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync single account limits with DigitalOcean API' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Account synced successfully',
    type: DoAccountResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async sync(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const account = await this.doAccountService.syncAccountLimits(id);
    return { data: account };
  }

  /**
   * Health check single account
   *
   * GET /internal/do-accounts/:id/health
   */
  @Get(':id/health')
  @ApiOperation({ summary: 'Perform health check on a single account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Health check result',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async healthCheck(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    const healthStatus = await this.doAccountService.healthCheck(id);
    return {
      data: {
        accountId: id,
        healthStatus,
        checkedAt: new Date().toISOString(),
      },
    };
  }
}
