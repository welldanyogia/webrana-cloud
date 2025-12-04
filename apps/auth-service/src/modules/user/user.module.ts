import { Module } from '@nestjs/common';

import { PasswordService } from '../../common/services/password.service';

import { UserService } from './user.service';

@Module({
  providers: [UserService, PasswordService],
  exports: [UserService],
})
export class UserModule {}
