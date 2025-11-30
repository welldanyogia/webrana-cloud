import { Module } from '@nestjs/common';

import { AdminCatalogController } from './admin-catalog.controller';
import { CatalogController } from './catalog.controller';
import { InternalCatalogController } from './internal-catalog.controller';
import { VpsImageService } from './vps-image.service';
import { VpsPlanService } from './vps-plan.service';

@Module({
  controllers: [CatalogController, AdminCatalogController, InternalCatalogController],
  providers: [VpsPlanService, VpsImageService],
  exports: [VpsPlanService, VpsImageService],
})
export class CatalogModule {}
