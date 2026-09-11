import { Controller, Get, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { ClosingsService } from './closings.service';

@Controller('closings-cron')
export class ClosingsCronController {
  constructor(private readonly closingsService: ClosingsService) {}

  @Get('auto-close')
  async autoClose(
    @Headers('authorization') authHeader?: string,
    @Query('fecha') fecha?: string,
  ) {
    const cronSecret = process.env.CRON_SECRET;
    // Si CRON_SECRET está definido en el entorno, obligamos a validar el Bearer token
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedException('No autorizado: CRON_SECRET inválido');
    }

    return this.closingsService.autoCloseToday(fecha);
  }
}
