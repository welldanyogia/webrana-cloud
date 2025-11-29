import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { AdminCatalogController } from './admin-catalog.controller';
import { VpsPlanService } from './vps-plan.service';
import { VpsImageService } from './vps-image.service';

@Module({
  controllers: [CatalogController, AdminCatalogController],
  providers: [VpsPlanService, VpsImageService],
  exports: [VpsPlanService, VpsImageService],
})
export class CatalogModule {}
