import { Module, forwardRef } from '@nestjs/common';

import { TripayModule } from '../tripay/tripay.module';

import { DepositController } from './deposit.controller';
import { DepositService } from './deposit.service';
import { InternalWalletController } from './internal-wallet.controller';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [forwardRef(() => TripayModule)],
  controllers: [WalletController, DepositController, InternalWalletController],
  providers: [WalletService, DepositService],
  exports: [WalletService, DepositService],
})
export class WalletModule {}
