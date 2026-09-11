import { Injectable } from '@nestjs/common';
import { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { Order, OrderDetail } from '../../../domain/entities/order.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToOrder(dbOrder: any): Order {
    return {
      id: dbOrder.id,
      codigo: dbOrder.codigo,
      cliente_id: dbOrder.cliente_id,
      vendedor_id: dbOrder.vendedor_id,
      estado: dbOrder.estado as Order['estado'],
      total: Number(dbOrder.total),
      motivo_falla: dbOrder.motivo_falla,
      metodo_pago: dbOrder.metodo_pago,
      fecha_creacion: dbOrder.fecha_creacion ?? new Date(),
      fecha_entrega: dbOrder.fecha_entrega,
      updated_at: dbOrder.updated_at ?? new Date(),
      cliente: dbOrder.cliente
        ? {
            nombre: dbOrder.cliente.nombre,
            telefono: dbOrder.cliente.telefono,
            direccion: dbOrder.cliente.direccion,
            ubicacion_url: dbOrder.cliente.ubicacion_url,
          }
        : undefined,
      vendedor: dbOrder.vendedor
        ? {
            nombre: dbOrder.vendedor.nombre,
            telefono: dbOrder.vendedor.telefono,
            avatar: dbOrder.vendedor.avatar,
          }
        : undefined,
      detalles: dbOrder.detalles
        ? dbOrder.detalles.map((d: any) => ({
            id: d.id,
            pedido_id: d.pedido_id,
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            precio_aplicado: Number(d.precio_aplicado),
            producto: d.producto
              ? {
                  nombre: d.producto.nombre,
                  unidad: d.producto.unidad,
                }
              : undefined,
          }))
        : undefined,
    };
  }

  async findById(id: string): Promise<Order | null> {
    const order = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        vendedor: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });
    return order ? this.mapToOrder(order) : null;
  }

  async findAll(filters?: { 
    estado?: string; 
    vendedor_id?: string; 
    cliente_id?: string;
    fecha_inicio?: Date;
    fecha_fin?: Date;
  }): Promise<Order[]> {
    const where: any = {};
    if (filters?.estado) {
      where.estado = filters.estado;
    }
    if (filters?.vendedor_id) {
      where.vendedor_id = filters.vendedor_id;
    }
    if (filters?.cliente_id) {
      where.cliente_id = filters.cliente_id;
    }
    if (filters?.fecha_inicio || filters?.fecha_fin) {
      where.fecha_creacion = {};
      if (filters.fecha_inicio) {
        where.fecha_creacion.gte = filters.fecha_inicio;
      }
      if (filters.fecha_fin) {
        where.fecha_creacion.lt = filters.fecha_fin;
      }
    }

    const orders = await this.prisma.pedido.findMany({
      where,
      include: {
        cliente: true,
        vendedor: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: { fecha_creacion: 'desc' },
    });

    return orders.map((o) => this.mapToOrder(o));
  }

  async create(order: {
    codigo: string;
    cliente_id: string;
    vendedor_id: string | null;
    estado: Order['estado'];
    total: number;
    metodo_pago?: 'efectivo' | 'qr' | null;
    detalles: Array<{
      producto_id: string;
      cantidad: number;
      precio_aplicado: number;
    }>;
    fecha_entrega?: Date | null;
    fecha_creacion?: Date;
  }): Promise<Order> {
    const created = await this.prisma.pedido.create({
      data: {
        codigo: order.codigo,
        cliente_id: order.cliente_id,
        vendedor_id: order.vendedor_id,
        estado: order.estado,
        total: order.total,
        metodo_pago: order.metodo_pago,
        fecha_entrega: order.fecha_entrega,
        fecha_creacion: order.fecha_creacion,
        detalles: {
          create: order.detalles.map((d) => ({
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            precio_aplicado: d.precio_aplicado,
          })),
        },
      },
      include: {
        cliente: true,
        vendedor: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    return this.mapToOrder(created);
  }

  async updateStatus(
    id: string,
    estado: Order['estado'],
    extra?: { motivo_falla?: string | null; fecha_entrega?: Date | null; metodo_pago?: 'efectivo' | 'qr' | null }
  ): Promise<Order> {
    const data: any = { estado };
    if (extra?.motivo_falla !== undefined) {
      data.motivo_falla = extra.motivo_falla;
    }
    if (extra?.fecha_entrega !== undefined) {
      data.fecha_entrega = extra.fecha_entrega;
    }
    if (extra?.metodo_pago !== undefined) {
      data.metodo_pago = extra.metodo_pago;
    }

    const updated = await this.prisma.pedido.update({
      where: { id },
      data,
      include: {
        cliente: true,
        vendedor: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    return this.mapToOrder(updated);
  }

  async update(
    id: string,
    order: {
      cliente_id?: string;
      vendedor_id?: string | null;
      estado?: Order['estado'];
      metodo_pago?: 'efectivo' | 'qr' | null;
      total?: number;
      detalles?: Array<{
        producto_id: string;
        cantidad: number;
        precio_aplicado: number;
      }>;
    }
  ): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      const data: any = {};
      if (order.cliente_id !== undefined) data.cliente_id = order.cliente_id;
      if (order.vendedor_id !== undefined) data.vendedor_id = order.vendedor_id;
      if (order.estado !== undefined) data.estado = order.estado;
      if (order.metodo_pago !== undefined) data.metodo_pago = order.metodo_pago;
      if (order.total !== undefined) data.total = order.total;

      await tx.pedido.update({
        where: { id },
        data,
      });

      if (order.detalles !== undefined) {
        await tx.detallePedido.deleteMany({
          where: { pedido_id: id },
        });

        await tx.detallePedido.createMany({
          data: order.detalles.map((d) => ({
            pedido_id: id,
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            precio_aplicado: d.precio_aplicado,
          })),
        });
      }

      const updated = await tx.pedido.findUnique({
        where: { id },
        include: {
          cliente: true,
          vendedor: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      if (!updated) {
        throw new Error(`Pedido con ID ${id} no encontrado`);
      }

      return this.mapToOrder(updated);
    });
  }

  async findLatestDeliveredPrice(clientId: string, productId: string): Promise<number | null> {
    const latestDetail = await this.prisma.detallePedido.findFirst({
      where: {
        producto_id: productId,
        pedido: {
          cliente_id: clientId,
          estado: 'delivered',
        },
      },
      orderBy: {
        pedido: {
          fecha_creacion: 'desc',
        },
      },
      select: {
        precio_aplicado: true,
      },
    });
    return latestDetail ? Number(latestDetail.precio_aplicado) : null;
  }

  async findClientOrderHistory(clientId: string): Promise<Order[]> {
    const orders = await this.prisma.pedido.findMany({
      where: { cliente_id: clientId },
      include: {
        cliente: true,
        vendedor: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: { fecha_creacion: 'desc' },
    });
    return orders.map((o) => this.mapToOrder(o));
  }

  async moveToNextDay(orderIds: string[], nextDate: Date): Promise<number> {
    if (!orderIds || orderIds.length === 0) return 0;

    const result = await this.prisma.pedido.updateMany({
      where: {
        id: { in: orderIds },
      },
      data: {
        fecha_creacion: nextDate,
        estado: 'pending',
        motivo_falla: null,
        fecha_entrega: null,
      },
    });

    return result.count;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.pedido.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
