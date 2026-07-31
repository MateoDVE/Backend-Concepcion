import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ClosingsService } from './closings.service';
import { CreateClosingDto } from './dto/create-closing.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('closings')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ClosingsController {
  constructor(private readonly closingsService: ClosingsService) {}

  @Post()
  @Roles('admin', 'vendedor')
  async createClosing(@Body() dto: CreateClosingDto) {
    return this.closingsService.createClosing(dto);
  }

  @Get('report/daily')
  @Roles('admin', 'vendedor')
  async getDailyReportOperativo(@Query('fecha') fecha?: string) {
    return this.closingsService.getDailyReportOperativo(fecha);
  }

  @Get('report/history')
  @Roles('admin')
  async getGeneralReportHistorico() {
    return this.closingsService.getGeneralReportHistorico();
  }
}
