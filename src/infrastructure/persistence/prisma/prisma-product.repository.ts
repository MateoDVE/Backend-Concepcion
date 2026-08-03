import { Injectable } from '@nestjs/common';
import { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { Product } from '../../../domain/entities/product.entity';
import { PrismaService } from './prisma.service';
import { Producto } from '@prisma/client';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToProduct(dbProduct: Producto): Product {
    return {
      id: dbProduct.id,
      nombre: dbProduct.nombre,
      precio_base: Number(dbProduct.precio_base),
      stock: dbProduct.stock,
      unidad: dbProduct.unidad,
      created_at: dbProduct.created_at ?? new Date(),
      updated_at: dbProduct.updated_at ?? new Date(),
    };
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.prisma.producto.findUnique({ where: { id } });
    return product ? this.mapToProduct(product) : null;
  }

  async findAll(): Promise<Product[]> {
    const products = await this.prisma.producto.findMany({
      orderBy: { nombre: 'asc' },
    });
    return products.map((p) => this.mapToProduct(p));
  }

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const created = await this.prisma.producto.create({
      data: {
        nombre: product.nombre,
        precio_base: product.precio_base,
        stock: product.stock,
        unidad: product.unidad,
      },
    });
    return this.mapToProduct(created);
  }

  async update(
    id: string,
    product: Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Product> {
    const updated = await this.prisma.producto.update({
      where: { id },
      data: {
        nombre: product.nombre,
        precio_base: product.precio_base,
        stock: product.stock,
        unidad: product.unidad,
      },
    });
    return this.mapToProduct(updated);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.producto.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async updateStock(id: string, amount: number): Promise<Product> {
    const updated = await this.prisma.producto.update({
      where: { id },
      data: {
        stock: {
          increment: amount,
        },
      },
    });
    return this.mapToProduct(updated);
  }

  async updateStockAndLog(id: string, amount: number, userId: string): Promise<Product> {
    if (amount <= 0) {
      // Just update the stock without logging (e.g. negative adjustments by admin)
      return this.updateStock(id, amount);
    }
    
    // Positive addition: update stock and log it in transaction
    const [updatedProduct] = await this.prisma.$transaction([
      this.prisma.producto.update({
        where: { id },
        data: {
          stock: {
            increment: amount,
          },
        },
      }),
      this.prisma.registroStock.create({
        data: {
          producto_id: id,
          cantidad: amount,
          usuario_id: userId,
        },
      }),
    ]);
    return this.mapToProduct(updatedProduct);
  }

  async getProductionReport(dateStr?: string): Promise<any[]> {
    let targetDate = new Date();
    if (dateStr) {
      targetDate = new Date(dateStr + 'T00:00:00');
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.registroStock.findMany({
      where: {
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        producto: {
          select: {
            nombre: true,
            unidad: true,
          },
        },
        usuario: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }
}
