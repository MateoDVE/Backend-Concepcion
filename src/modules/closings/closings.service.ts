import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CLOSING_REPOSITORY_TOKEN, USER_REPOSITORY_TOKEN } from '../../domain/repositories/tokens';
import type { IClosingRepository } from '../../domain/repositories/closing.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { CreateClosingDto } from './dto/create-closing.dto';

@Injectable()
export class ClosingsService {
  constructor(
    @Inject(CLOSING_REPOSITORY_TOKEN)
    private readonly closingRepo: IClosingRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async createClosing(dto: CreateClosingDto) {
    // Validar que el vendedor exista
    const vendor = await this.userRepo.findVendorById(dto.vendedor_id);
    if (!vendor) {
      throw new NotFoundException(`Vendedor con ID ${dto.vendedor_id} no encontrado`);
    }

    const fechaDate = new Date(dto.fecha);
    
    // Validar si ya existe un cierre para este vendedor en esta fecha
    const existing = await this.closingRepo.findClosingByDateAndVendor(fechaDate, dto.vendedor_id);
    if (existing) {
      throw new BadRequestException(`Ya existe un cierre de caja registrado para el vendedor en la fecha ${dto.fecha}`);
    }

    // Validar consistencia de la diferencia
    const calculoDiferencia = Number((dto.total_recaudado - dto.total_sistema).toFixed(2));
    if (Math.abs(dto.diferencia - calculoDiferencia) > 0.01) {
      throw new BadRequestException(`Inconsistencia en la diferencia de dinero. Recaudado (${dto.total_recaudado}) - Sistema (${dto.total_sistema}) = ${calculoDiferencia}, pero se ingresó ${dto.diferencia}`);
    }

    return this.closingRepo.createClosing({
      fecha: fechaDate,
      vendedor_id: dto.vendedor_id,
      total_pedidos: dto.total_pedidos,
      entregados: dto.entregados,
      fallidos: dto.fallidos,
      total_sistema: dto.total_sistema,
      total_recaudado: dto.total_recaudado,
      diferencia: dto.diferencia,
      observaciones: dto.observaciones ?? null,
    });
  }

  async getDailyReportOperativo(fechaStr?: string) {
    const fecha = fechaStr ? new Date(fechaStr) : new Date();
    return this.closingRepo.getDailyReportOperativo(fecha);
  }

  async getGeneralReportHistorico() {
    return this.closingRepo.getGeneralReportHistorico();
  }
}
