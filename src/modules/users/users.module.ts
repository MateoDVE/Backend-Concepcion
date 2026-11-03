import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { StaffService } from './staff.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, StaffService],
  exports: [UsersService],
})
export class UsersModule {}
