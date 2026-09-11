import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ORDER_REPOSITORY_TOKEN, CLIENT_REPOSITORY_TOKEN, PRODUCT_REPOSITORY_TOKEN } from '../../domain/repositories/tokens';
import type { IOrderRepository } from '../../domain/repositories/order.repository.interface';
import type { IClientRepository } from '../../domain/repositories/client.repository.interface';
import type { IProductRepository } from '../../domain/repositories/product.repository.interface';
import type { Order } from '../../domain/entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY_TOKEN)
    private readonly orderRepo: IOrderRepository,
    @Inject(CLIENT_REPOSITORY_TOKEN)
    private readonly clientRepo: IClientRepository,
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepo: IProductRepository,
  ) {}

  async findAll(filters?: { estado?: string; vendedor_id?: string; cliente_id?: string }) {
    return this.orderRepo.findAll(filters);
  }

  async findById(id: string) {
    const order = await this.orderRepo.findById(id);
    if (!order) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado`);
    }
    return order;
  }

  async getSuggestedPrice(clientId: string, productId: string): Promise<number> {
    // Validar existencia de cliente
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${clientId} no encontrado`);
    }

    // Validar existencia de producto
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException(`Producto con ID ${productId} no encontrado`);
    }

    // Regla 1: Precio especial asignado al cliente
    const specialPrice = await this.clientRepo.findSpecialPrice(clientId, productId);
    if (specialPrice) {
      return specialPrice.precio_especial;
    }

    // Regla 2: Último precio aplicado de un pedido entregado ('delivered')
    const lastPrice = await this.orderRepo.findLatestDeliveredPrice(clientId, productId);
    if (lastPrice !== null) {
      return lastPrice;
    }

    // Regla 3: Precio base del producto
    return product.precio_base;
  }

  async create(dto: CreateOrderDto) {
    // Validar cliente
    const client = await this.clientRepo.findById(dto.cliente_id);
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${dto.cliente_id} no encontrado`);
    }

    // Generar código único para el pedido (Ej: ORD-2475)
    const codigo = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const detallesProcesados: Array<{
      producto_id: string;
      cantidad: number;
      precio_aplicado: number;
    }> = [];

    let totalAcumulado = 0;

    for (const detail of dto.detalles) {
      const product = await this.productRepo.findById(detail.producto_id);
      if (!product) {
        throw new NotFoundException(`Producto con ID ${detail.producto_id} no encontrado`);
      }

      // Si no se especifica el precio, se calcula el sugerido
      let precioFinal = detail.precio_aplicado;
      if (precioFinal === undefined) {
        precioFinal = await this.getSuggestedPrice(dto.cliente_id, detail.producto_id);
      }

      detallesProcesados.push({
        producto_id: detail.producto_id,
        cantidad: detail.cantidad,
        precio_aplicado: precioFinal,
      });

      totalAcumulado += detail.cantidad * precioFinal;
    }

    const createdOrder = await this.orderRepo.create({
      codigo,
      cliente_id: dto.cliente_id,
      vendedor_id: dto.vendedor_id ?? null,
      estado: dto.estado ?? 'pending',
      metodo_pago: dto.estado === 'delivered' ? (dto.metodo_pago || 'efectivo') : (dto.metodo_pago ?? null),
      total: totalAcumulado,
      detalles: detallesProcesados,
      fecha_entrega: dto.estado === 'delivered' ? new Date() : null,
    });

    // Descontar del inventario si se crea directamente como entregado
    if (dto.estado === 'delivered') {
      for (const detail of detallesProcesados) {
        try {
          await this.productRepo.updateStock(detail.producto_id, -detail.cantidad);
        } catch (err: any) {
          throw new BadRequestException(`No se pudo procesar la entrega. Error de inventario: ${err.message}`);
        }
      }
    }

    return createdOrder;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.findById(id);

    if (dto.estado === 'failed' && (!dto.motivo_falla || dto.motivo_falla.trim() === '')) {
      throw new BadRequestException('Debe indicar un motivo de falla cuando el pedido queda en estado fallido (failed)');
    }

    const dataUpdate: { motivo_falla?: string | null; fecha_entrega?: Date | null; metodo_pago?: 'efectivo' | 'qr' | null } = {};

    // Si pasa a entregado (delivered), actualizar fecha de entrega y método de pago
    if (dto.estado === 'delivered') {
      dataUpdate.fecha_entrega = new Date();
      dataUpdate.motivo_falla = undefined;
      dataUpdate.metodo_pago = dto.metodo_pago || 'efectivo';

      // Descontar del inventario/stock solo si no estaba previamente entregado
      if (order.estado !== 'delivered' && order.detalles) {
        for (const detail of order.detalles) {
          // Descontamos stock. Notar que mandamos cantidad negativa a updateStock
          try {
            await this.productRepo.updateStock(detail.producto_id, -detail.cantidad);
          } catch (err: any) {
            throw new BadRequestException(`No se pudo procesar la entrega. Error de inventario: ${err.message}`);
          }
        }
      }
    } else if (dto.estado === 'failed') {
      dataUpdate.fecha_entrega = null;
      dataUpdate.motivo_falla = dto.motivo_falla;
      dataUpdate.metodo_pago = null;

      // Si el pedido estaba entregado y cambia a otro estado, devolvemos el stock al inventario
      if (order.estado === 'delivered' && order.detalles) {
        for (const detail of order.detalles) {
          await this.productRepo.updateStock(detail.producto_id, detail.cantidad);
        }
      }
    } else {
      dataUpdate.fecha_entrega = null;
      dataUpdate.motivo_falla = null;
      dataUpdate.metodo_pago = null;

      // Si el pedido estaba entregado y cambia a otro estado, devolvemos el stock al inventario
      if (order.estado === 'delivered' && order.detalles) {
        for (const detail of order.detalles) {
          await this.productRepo.updateStock(detail.producto_id, detail.cantidad);
        }
      }
    }

    const updatedOrder = await this.orderRepo.updateStatus(id, dto.estado, dataUpdate);
    return updatedOrder;
  }

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.findById(id);

    const updateData: any = {};

    if (dto.cliente_id !== undefined) {
      const client = await this.clientRepo.findById(dto.cliente_id);
      if (!client) {
        throw new NotFoundException(`Cliente con ID ${dto.cliente_id} no encontrado`);
      }
      updateData.cliente_id = dto.cliente_id;
    }

    if (dto.vendedor_id !== undefined) {
      updateData.vendedor_id = dto.vendedor_id ?? null;
    }

    if (dto.estado !== undefined) {
      updateData.estado = dto.estado;
    }

    if (dto.metodo_pago !== undefined) {
      updateData.metodo_pago = dto.metodo_pago;
    }

    if (dto.detalles !== undefined) {
      const detallesProcesados: Array<{
        producto_id: string;
        cantidad: number;
        precio_aplicado: number;
      }> = [];

      let totalAcumulado = 0;
      const clienteIdFinal = dto.cliente_id ?? order.cliente_id;

      for (const detail of dto.detalles) {
        const product = await this.productRepo.findById(detail.producto_id);
        if (!product) {
          throw new NotFoundException(`Producto con ID ${detail.producto_id} no encontrado`);
        }

        let precioFinal = detail.precio_aplicado;
        if (precioFinal === undefined) {
          precioFinal = await this.getSuggestedPrice(clienteIdFinal, detail.producto_id);
        }

        detallesProcesados.push({
          producto_id: detail.producto_id,
          cantidad: detail.cantidad,
          precio_aplicado: precioFinal,
        });

        totalAcumulado += detail.cantidad * precioFinal;
      }

      updateData.detalles = detallesProcesados;
      updateData.total = totalAcumulado;
    }

    return this.orderRepo.update(id, updateData);
  }

  async rescheduleToNextDay(order: Order): Promise<Order> {
    const codigo = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const nowBolivia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
    const tomorrowBolivia = new Date(nowBolivia);
    tomorrowBolivia.setDate(tomorrowBolivia.getDate() + 1);
    const year = tomorrowBolivia.getFullYear();
    const month = String(tomorrowBolivia.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrowBolivia.getDate()).padStart(2, '0');
    const tomorrow = new Date(`${year}-${month}-${day}T12:00:00.000Z`);

    const detallesProcesados = (order.detalles || []).map((d) => ({
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_aplicado: d.precio_aplicado,
    }));

    return this.orderRepo.create({
      codigo,
      cliente_id: order.cliente_id,
      vendedor_id: order.vendedor_id ?? null,
      estado: 'pending',
      total: order.total,
      detalles: detallesProcesados,
      fecha_creacion: tomorrow,
    });
  }

  async moveUnfulfilledOrdersToNextDay(fechaReferencia?: string) {
    // 1. Obtener fecha de referencia en zona horaria America/La_Paz
    let dateStr: string;
    if (fechaReferencia) {
      dateStr = fechaReferencia.split('T')[0];
    } else {
      const nowBolivia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
      const year = nowBolivia.getFullYear();
      const month = String(nowBolivia.getMonth() + 1).padStart(2, '0');
      const day = String(nowBolivia.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    // El día local de Bolivia empieza a las 04:00 UTC y termina a las 04:00 UTC del día siguiente (UTC-4)
    const startOfTodayUTC = new Date(`${dateStr}T04:00:00.000Z`);
    const endOfTodayUTC = new Date(startOfTodayUTC.getTime() + 24 * 60 * 60 * 1000);

    // Calcular la fecha destino: el día siguiente a las 08:00 AM hora Bolivia (12:00 UTC)
    const baseDate = new Date(`${dateStr}T12:00:00.000Z`);
    const nextDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);

    // 2. Buscar pedidos de la jornada que no fueron entregados (cargados, pendientes, fallados, ruta)
    const orders = await this.orderRepo.findAll({
      fecha_inicio: startOfTodayUTC,
      fecha_fin: endOfTodayUTC,
    });

    const unfulfilled = orders.filter((o) =>
      ['pending', 'loaded', 'failed', 'route'].includes(o.estado)
    );

    if (unfulfilled.length === 0) {
      return {
        success: true,
        movedCount: 0,
        orderCodes: [],
        targetDate: nextDate.toISOString().split('T')[0],
      };
    }

    const orderIds = unfulfilled.map((o) => o.id);
    const movedCount = await this.orderRepo.moveToNextDay(orderIds, nextDate);

    return {
      success: true,
      movedCount,
      orderCodes: unfulfilled.map((o) => o.codigo),
      targetDate: nextDate.toISOString().split('T')[0],
    };
  }

  async delete(id: string) {
    const order = await this.findById(id);

    // Si el pedido estaba entregado, devolvemos el stock al inventario
    if (order.estado === 'delivered' && order.detalles) {
      for (const detail of order.detalles) {
        await this.productRepo.updateStock(detail.producto_id, detail.cantidad);
      }
    }

    const deleted = await this.orderRepo.delete(id);
    if (!deleted) {
      throw new BadRequestException(`No se pudo eliminar el pedido con ID ${id}`);
    }

    return { success: true };
  }
}
