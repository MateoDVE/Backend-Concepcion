import { Module } from '@nestjs/common';
import { ClosingsService } from './closings.service';
import { ClosingsController } from './closings.controller';

@Module({
  controllers: [ClosingsController],
  providers: [ClosingsService],
  exports: [ClosingsService],
})
export class ClosingsModule {}
