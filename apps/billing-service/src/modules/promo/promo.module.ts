import { Module, forwardRef } from '@nestjs/common';

import { WalletModule } from '../wallet/wallet.module';

import { AdminPromoController } from './admin-promo.controller';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  imports: [forwardRef(() => WalletModule)],
  controllers: [PromoController, AdminPromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
