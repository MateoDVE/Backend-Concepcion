import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PRODUCT_REPOSITORY_TOKEN } from '../../domain/repositories/tokens';
import type { IProductRepository } from '../../domain/repositories/product.repository.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCT_REPOSITORY_TOKEN)
    private readonly productRepo: IProductRepository,
  ) {}

  async findAll() {
    return this.productRepo.findAll();
  }

  async findById(id: string) {
    const product = await this.productRepo.findById(id);
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.productRepo.create({
      nombre: dto.nombre,
      precio_base: dto.precio_base,
      stock: dto.stock ?? 0,
      unidad: dto.unidad,
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id); // Valida que exista
    return this.productRepo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id); // Valida que exista
    const deleted = await this.productRepo.delete(id);
    if (!deleted) {
      throw new BadRequestException(`No se pudo eliminar el producto con ID ${id} (puede estar referenciado en pedidos existentes)`);
    }
    return { success: true };
  }

  async updateStockAndLog(id: string, amount: number, userId: string) {
    const product = await this.findById(id); // Valida que exista
    if (product.stock + amount < 0) {
      throw new BadRequestException(`El stock resultante no puede ser menor a 0. Stock actual: ${product.stock}`);
    }
    return this.productRepo.updateStockAndLog(id, amount, userId);
  }

  async getProductionReport(dateStr?: string) {
    return this.productRepo.getProductionReport(dateStr);
  }
}
