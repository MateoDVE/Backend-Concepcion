import { Module } from '@nestjs/common';
import { ClosingsService } from './closings.service';
import { ClosingsController } from './closings.controller';
import { ClosingsCronController } from './closings-cron.controller';

@Module({
  controllers: [ClosingsController, ClosingsCronController],
  providers: [ClosingsService],
  exports: [ClosingsService],
})
export class ClosingsModule {}
