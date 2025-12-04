import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';

import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

import {
  CreatePromoDto,
  UpdatePromoDto,
  ListPromosQueryDto,
  PromoResponseDto,
  PromoListResponseDto,
  PromoStatsDto,
} from './dto/promo.dto';
import { PromoService } from './promo.service';

/**
 * Admin Promo Controller - Admin Promo Management
 *
 * Base path: /api/v1/admin/promos
 * Authentication: X-API-Key header required + Optional Admin JWT
 */
@ApiTags('Admin Promos')
@ApiSecurity('X-API-Key')
@Controller('api/v1/admin/promos')
@UseGuards(ApiKeyGuard, AdminRoleGuard)
export class AdminPromoController {
  constructor(private readonly promoService: PromoService) {}

  /**
   * GET /api/v1/admin/promos
   * List all promos with pagination
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all promos' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of promos',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async listPromos(@Query() query: ListPromosQueryDto): Promise<PromoListResponseDto> {
    return this.promoService.listPromos(query);
  }

  /**
   * POST /api/v1/admin/promos
   * Create a new promo
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new promo' })
  @ApiResponse({
    status: 201,
    description: 'Promo created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 409, description: 'Promo code already exists' })
  async createPromo(@Body() dto: CreatePromoDto): Promise<{ data: PromoResponseDto }> {
    const promo = await this.promoService.createPromo(dto);
    return { data: promo };
  }

  /**
   * GET /api/v1/admin/promos/:id
   * Get promo details by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get promo details' })
  @ApiResponse({
    status: 200,
    description: 'Returns promo details',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Promo not found' })
  async getPromo(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ data: PromoResponseDto }> {
    const promo = await this.promoService.getPromoById(id);
    return { data: promo };
  }

  /**
   * PATCH /api/v1/admin/promos/:id
   * Update a promo
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a promo' })
  @ApiResponse({
    status: 200,
    description: 'Promo updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Promo not found' })
  async updatePromo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoDto
  ): Promise<{ data: PromoResponseDto }> {
    const promo = await this.promoService.updatePromo(id, dto);
    return { data: promo };
  }

  /**
   * DELETE /api/v1/admin/promos/:id
   * Delete a promo (soft delete if has redemptions)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a promo' })
  @ApiResponse({
    status: 204,
    description: 'Promo deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Promo not found' })
  async deletePromo(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.promoService.deletePromo(id);
  }

  /**
   * GET /api/v1/admin/promos/:id/stats
   * Get promo usage statistics
   */
  @Get(':id/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get promo usage statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns promo usage statistics',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Promo not found' })
  async getPromoStats(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<{ data: PromoStatsDto }> {
    const stats = await this.promoService.getPromoStats(id);
    return { data: stats };
  }
}
