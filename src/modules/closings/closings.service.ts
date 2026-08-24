import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CLOSING_REPOSITORY_TOKEN, USER_REPOSITORY_TOKEN, ORDER_REPOSITORY_TOKEN } from '../../domain/repositories/tokens';
import type { IClosingRepository } from '../../domain/repositories/closing.repository.interface';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import type { IOrderRepository } from '../../domain/repositories/order.repository.interface';
import { CreateClosingDto } from './dto/create-closing.dto';

@Injectable()
export class ClosingsService {
  constructor(
    @Inject(CLOSING_REPOSITORY_TOKEN)
    private readonly closingRepo: IClosingRepository,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    @Inject(ORDER_REPOSITORY_TOKEN)
    private readonly orderRepo: IOrderRepository,
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

  async autoCloseToday() {
    // 1. Obtener la fecha actual en America/La_Paz
    const todayBolivia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    const year = todayBolivia.getFullYear();
    const month = String(todayBolivia.getMonth() + 1).padStart(2, '0');
    const day = String(todayBolivia.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const fechaCierre = new Date(`${dateStr}T00:00:00.000Z`);

    // El día local de Bolivia empieza a las 04:00 UTC y termina a las 04:00 UTC del día siguiente (UTC-4)
    const startOfTodayUTC = new Date(`${dateStr}T04:00:00.000Z`);
    const endOfTodayUTC = new Date(startOfTodayUTC.getTime() + 24 * 60 * 60 * 1000);

    // 2. Obtener todos los pedidos creados hoy en este rango
    const orders = await this.orderRepo.findAll({
      fecha_inicio: startOfTodayUTC,
      fecha_fin: endOfTodayUTC,
    });

    // 3. Obtener todos los vendedores activos
    const vendors = await this.userRepo.findAllVendors();
    const activeVendors = vendors.filter(v => v.activo !== false);

    const closuresCreated: Array<{ vendedor: string; cierre_id: string }> = [];

    // 4. Procesar cierres por vendedor
    for (const vendor of activeVendors) {
      const vendorOrders = orders.filter(o => o.vendedor_id === vendor.id);

      // Si el vendedor no tiene pedidos registrados hoy, no requiere cierre
      if (vendorOrders.length === 0) {
        continue;
      }

      // Validar si ya existe un cierre para este vendedor hoy
      const existing = await this.closingRepo.findClosingByDateAndVendor(fechaCierre, vendor.id);
      if (existing) {
        continue; // Omitir si ya tiene cierre
      }

      const total_pedidos = vendorOrders.length;
      const entregados = vendorOrders.filter(o => o.estado === 'delivered').length;
      const fallidos = vendorOrders.filter(o => o.estado === 'failed').length;
      
      const total_sistema = vendorOrders.reduce((sum, o) => sum + o.total, 0);
      const total_recaudado = vendorOrders.filter(o => o.estado === 'delivered').reduce((sum, o) => sum + o.total, 0);
      const diferencia = Number((total_recaudado - total_sistema).toFixed(2));

      const created = await this.closingRepo.createClosing({
        fecha: fechaCierre,
        vendedor_id: vendor.id,
        total_pedidos,
        entregados,
        fallidos,
        total_sistema,
        total_recaudado,
        diferencia,
        observaciones: 'Cierre de jornada automático (cron)',
      });

      closuresCreated.push({
        vendedor: vendor.nombre,
        cierre_id: created.id,
      });
    }

    return {
      success: true,
      fecha: dateStr,
      cierres_creados: closuresCreated,
    };
  }
}
