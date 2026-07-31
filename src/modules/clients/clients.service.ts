import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CLIENT_REPOSITORY_TOKEN, ORDER_REPOSITORY_TOKEN } from '../../domain/repositories/tokens';
import type { IClientRepository } from '../../domain/repositories/client.repository.interface';
import type { IOrderRepository } from '../../domain/repositories/order.repository.interface';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { SetSpecialPriceDto } from './dto/set-special-price.dto';

@Injectable()
export class ClientsService {
  constructor(
    @Inject(CLIENT_REPOSITORY_TOKEN)
    private readonly clientRepo: IClientRepository,
    @Inject(ORDER_REPOSITORY_TOKEN)
    private readonly orderRepo: IOrderRepository,
  ) {}

  async findAll(search?: string) {
    return this.clientRepo.findAll(search);
  }

  async findById(id: string) {
    const client = await this.clientRepo.findById(id);
    if (!client) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }
    return client;
  }

  async create(dto: CreateClientDto) {
    return this.clientRepo.create({
      nombre: dto.nombre,
      telefono: dto.telefono,
      direccion: dto.direccion,
      ubicacion_url: dto.ubicacion_url ?? null,
    });
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findById(id); // Valida que exista
    return this.clientRepo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id); // Valida que exista
    const deleted = await this.clientRepo.delete(id);
    if (!deleted) {
      throw new Error(`No se pudo eliminar el cliente con ID ${id}`);
    }
    return { success: true };
  }

  async findHistory(id: string) {
    await this.findById(id); // Valida que exista el cliente
    return this.orderRepo.findClientOrderHistory(id);
  }

  async getSpecialPrices(id: string) {
    await this.findById(id);
    return this.clientRepo.findSpecialPrices(id);
  }

  async setSpecialPrice(clientId: string, dto: SetSpecialPriceDto) {
    await this.findById(clientId);
    return this.clientRepo.setSpecialPrice(clientId, dto.producto_id, dto.precio_especial);
  }

  async deleteSpecialPrice(clientId: string, productId: string) {
    await this.findById(clientId);
    const deleted = await this.clientRepo.deleteSpecialPrice(clientId, productId);
    if (!deleted) {
      throw new NotFoundException(`No existe precio especial registrado para el cliente ${clientId} y producto ${productId}`);
    }
    return { success: true };
  }
}
