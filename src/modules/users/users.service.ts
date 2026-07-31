import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY_TOKEN } from '../../domain/repositories/tokens';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async findAllVendors() {
    return this.userRepo.findAllVendors();
  }

  async findVendorById(id: string) {
    const vendor = await this.userRepo.findVendorById(id);
    if (!vendor) {
      throw new NotFoundException(`Vendedor con ID ${id} no encontrado`);
    }
    return vendor;
  }

  async createVendor(dto: CreateVendorDto) {
    return this.userRepo.createVendor({
      nombre: dto.nombre,
      telefono: dto.telefono ?? null,
      avatar: dto.avatar,
      usuario_id: dto.usuario_id ?? null,
      activo: dto.activo ?? true,
    });
  }

  async updateVendor(id: string, dto: UpdateVendorDto) {
    await this.findVendorById(id); // Valida que exista
    return this.userRepo.updateVendor(id, dto);
  }
}
