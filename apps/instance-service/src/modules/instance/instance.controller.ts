import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { CurrentUser, CurrentUserData } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';

import {
  TriggerActionDto,
  PaginationQueryDto,
  InstanceResponseDto,
  InstanceDetailResponseDto,
  ActionResponseDto,
  PaginatedResult,
  ConsoleAccessResponseDto,
} from './dto';
import { InstanceService } from './instance.service';

@ApiTags('Instances')
@ApiBearerAuth('bearer')
@Controller('instances')
@UseGuards(JwtAuthGuard)
export class InstanceController {
  constructor(private readonly instanceService: InstanceService) {}

  @Get()
  @ApiOperation({ summary: 'List user instances', description: 'Get paginated list of VPS instances for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Instances retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInstances(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResult<InstanceResponseDto>> {
    return this.instanceService.getInstancesByUserId(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get instance details', description: 'Get VPS instance details with real-time status' })
  @ApiParam({ name: 'id', description: 'Instance UUID' })
  @ApiResponse({ status: 200, description: 'Instance retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied - not owner' })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  async getInstance(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) instanceId: string
  ): Promise<{ data: InstanceDetailResponseDto }> {
    const instance = await this.instanceService.getInstanceById(
      instanceId,
      userId
    );

    return { data: instance };
  }

  @Get(':id/console')
  @ApiOperation({ summary: 'Get VNC console URL', description: 'Get web console URL for VPS instance access' })
  @ApiParam({ name: 'id', description: 'Instance UUID' })
  @ApiResponse({ status: 200, description: 'Console URL retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Console not available - instance not ready' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied - not owner' })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  async getConsoleUrl(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) instanceId: string
  ): Promise<{ data: ConsoleAccessResponseDto }> {
    const consoleAccess = await this.instanceService.getConsoleUrl(
      instanceId,
      userId
    );

    return { data: consoleAccess };
  }

  @Post(':id/actions')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger instance action', description: 'Execute an action on VPS instance (reboot, power_off, power_on, reset_password)' })
  @ApiParam({ name: 'id', description: 'Instance UUID' })
  @ApiResponse({ status: 202, description: 'Action triggered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid action type or action not allowed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async triggerAction(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) instanceId: string,
    @Body() dto: TriggerActionDto
  ): Promise<{ data: ActionResponseDto }> {
    const action = await this.instanceService.triggerAction(
      instanceId,
      userId,
      dto.type
    );

    return { data: action };
  }

  @Get(':id/actions/:actionId')
  @ApiOperation({ summary: 'Get action status', description: 'Get status of a triggered instance action' })
  @ApiParam({ name: 'id', description: 'Instance UUID' })
  @ApiParam({ name: 'actionId', description: 'Action ID' })
  @ApiResponse({ status: 200, description: 'Action status retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Instance or action not found' })
  async getActionStatus(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) instanceId: string,
    @Param('actionId', ParseIntPipe) actionId: number
  ): Promise<{ data: ActionResponseDto }> {
    const action = await this.instanceService.getActionStatus(
      instanceId,
      actionId,
      userId
    );

    return { data: action };
  }
}
