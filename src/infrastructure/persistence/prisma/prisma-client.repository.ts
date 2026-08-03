import { Injectable } from '@nestjs/common';
import { IClientRepository } from '../../../domain/repositories/client.repository.interface';
import { Client } from '../../../domain/entities/client.entity';
import { PriceClient } from '../../../domain/entities/price-client.entity';
import { PrismaService } from './prisma.service';
import { Cliente, PrecioCliente } from '@prisma/client';

@Injectable()
export class PrismaClientRepository implements IClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToClient(dbClient: Cliente & { creado_por?: any; actualizado_por?: any }): Client {
    return {
      id: dbClient.id,
      nombre: dbClient.nombre,
      telefono: dbClient.telefono,
      direccion: dbClient.direccion,
      ubicacion_url: dbClient.ubicacion_url,
      tipo_cliente: dbClient.tipo_cliente,
      creado_por_id: dbClient.creado_por_id,
      creado_por_nombre: dbClient.creado_por?.nombre || null,
      actualizado_por_id: dbClient.actualizado_por_id,
      actualizado_por_nombre: dbClient.actualizado_por?.nombre || null,
      created_at: dbClient.created_at ?? new Date(),
      updated_at: dbClient.updated_at ?? new Date(),
    };
  }

  private mapToPriceClient(dbPrice: PrecioCliente): PriceClient {
    return {
      id: dbPrice.id,
      cliente_id: dbPrice.cliente_id,
      producto_id: dbPrice.producto_id,
      precio_especial: Number(dbPrice.precio_especial),
      created_at: dbPrice.created_at ?? new Date(),
      updated_at: dbPrice.updated_at ?? new Date(),
    };
  }

  async findById(id: string): Promise<Client | null> {
    const client = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        creado_por: true,
        actualizado_por: true,
      },
    });
    return client ? this.mapToClient(client) : null;
  }

  async findAll(search?: string): Promise<Client[]> {
    const where = search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' as const } },
            { telefono: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const clients = await this.prisma.cliente.findMany({
      where,
      include: {
        creado_por: true,
        actualizado_por: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return clients.map((c) => this.mapToClient(c));
  }

  async create(client: Omit<Client, 'id' | 'created_at' | 'updated_at'> & { precios_especiales?: { producto_id: string; precio_especial: number }[] }): Promise<Client> {
    const created = await this.prisma.cliente.create({
      data: {
        nombre: client.nombre,
        telefono: client.telefono,
        direccion: client.direccion,
        ubicacion_url: client.ubicacion_url,
        tipo_cliente: client.tipo_cliente,
        creado_por_id: client.creado_por_id,
        creado_por_nombre: client.creado_por_nombre,
        precios_clientes: client.precios_especiales && client.precios_especiales.length > 0 ? {
          create: client.precios_especiales.map((pe) => ({
            producto_id: pe.producto_id,
            precio_especial: pe.precio_especial,
          })),
        } : undefined,
      },
      include: {
        creado_por: true,
        actualizado_por: true,
      },
    });
    return this.mapToClient(created);
  }

  async update(
    id: string,
    client: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Client> {
    const updated = await this.prisma.cliente.update({
      where: { id },
      data: {
        nombre: client.nombre,
        telefono: client.telefono,
        direccion: client.direccion,
        ubicacion_url: client.ubicacion_url,
        tipo_cliente: client.tipo_cliente,
        actualizado_por_id: client.actualizado_por_id,
        actualizado_por_nombre: client.actualizado_por_nombre,
      },
      include: {
        creado_por: true,
        actualizado_por: true,
      },
    });
    return this.mapToClient(updated);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.cliente.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async findSpecialPrices(clientId: string): Promise<PriceClient[]> {
    const prices = await this.prisma.precioCliente.findMany({
      where: { cliente_id: clientId },
    });
    return prices.map((p) => this.mapToPriceClient(p));
  }

  async findSpecialPrice(clientId: string, productId: string): Promise<PriceClient | null> {
    const price = await this.prisma.precioCliente.findUnique({
      where: {
        cliente_id_producto_id: {
          cliente_id: clientId,
          producto_id: productId,
        },
      },
    });
    return price ? this.mapToPriceClient(price) : null;
  }

  async setSpecialPrice(
    clientId: string,
    productId: string,
    precioEspecial: number
  ): Promise<PriceClient> {
    const price = await this.prisma.precioCliente.upsert({
      where: {
        cliente_id_producto_id: {
          cliente_id: clientId,
          producto_id: productId,
        },
      },
      update: {
        precio_especial: precioEspecial,
      },
      create: {
        cliente_id: clientId,
        producto_id: productId,
        precio_especial: precioEspecial,
      },
    });
    return this.mapToPriceClient(price);
  }

  async deleteSpecialPrice(clientId: string, productId: string): Promise<boolean> {
    try {
      await this.prisma.precioCliente.delete({
        where: {
          cliente_id_producto_id: {
            cliente_id: clientId,
            producto_id: productId,
          },
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
