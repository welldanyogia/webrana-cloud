import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { PasswordService } from '../../common/services/password.service';

@Module({
  providers: [UserService, PasswordService],
  exports: [UserService],
})
export class UserModule {}
