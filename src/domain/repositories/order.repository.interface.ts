import { Order, OrderDetail } from '../entities/order.entity';

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findAll(filters?: { estado?: string; vendedor_id?: string; cliente_id?: string }): Promise<Order[]>;
  create(order: {
    codigo: string;
    cliente_id: string;
    vendedor_id: string | null;
    estado: Order['estado'];
    total: number;
    detalles: Array<{
      producto_id: string;
      cantidad: number;
      precio_aplicado: number;
    }>;
    fecha_entrega?: Date | null;
  }): Promise<Order>;
  updateStatus(
    id: string,
    estado: Order['estado'],
    extra?: { motivo_falla?: string | null; fecha_entrega?: Date | null }
  ): Promise<Order>;
  update(
    id: string,
    order: {
      cliente_id?: string;
      vendedor_id?: string | null;
      estado?: Order['estado'];
      total?: number;
      detalles?: Array<{
        producto_id: string;
        cantidad: number;
        precio_aplicado: number;
      }>;
    }
  ): Promise<Order>;
  findLatestDeliveredPrice(clientId: string, productId: string): Promise<number | null>;
  findClientOrderHistory(clientId: string): Promise<Order[]>;
  delete(id: string): Promise<boolean>;
}
