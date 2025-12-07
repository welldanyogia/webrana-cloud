import { Module } from '@nestjs/common';

import { CatalogProxyController } from './catalog-proxy.controller';

@Module({
  controllers: [CatalogProxyController],
})
export class CatalogProxyModule {}
