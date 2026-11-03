import { Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository, NewStaff, StaffUser } from '../../../domain/repositories/user.repository.interface';
import { User } from '../../../domain/entities/user.entity';
import { Vendor } from '../../../domain/entities/vendor.entity';
import { PrismaService } from './prisma.service';
import { Usuario, Vendedor } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async setStaffStatus(id: string, activo: boolean): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const result = await tx.usuario.updateMany({
        where: { id, rol: { in: ['vendedor', 'almacen'] } },
        data: { activo, updated_at: new Date() },
      });
      if (!result.count) throw new NotFoundException('Usuario operativo no encontrado.');
      await tx.vendedor.updateMany({
        where: { usuario_id: id }, data: { activo, updated_at: new Date() },
      });
    });
  }

  async findAllStaff(): Promise<StaffUser[]> {
    const users = await this.prisma.usuario.findMany({
      where: { rol: { in: ['vendedor', 'almacen'] } },
      select: {
        id: true, usuario: true, nombre: true, rol: true, activo: true,
        vendedor: { select: { nombre: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    return users.map(({ vendedor, ...user }) => ({
      ...user,
      // Existing accounts can retain seed names while the operational vendor was renamed.
      nombre: user.rol === 'vendedor' ? vendedor?.nombre ?? user.nombre : user.nombre,
      rol: user.rol as StaffUser['rol'],
      activo: user.activo ?? true,
    })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  async createStaff(staff: NewStaff): Promise<StaffUser> {
    // Nested create is atomic: the profile and vendor are saved together.
    const user = await this.prisma.usuario.create({
      data: {
        id: staff.id, usuario: staff.usuario, nombre: staff.nombre,
        rol: staff.rol, activo: true, contrasena_hash: 'SUPABASE_AUTH',
        ...(staff.rol === 'vendedor' ? {
          vendedor: { create: {
            nombre: staff.nombre, telefono: staff.telefono || null, activo: true,
            avatar: staff.nombre.split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase(),
          } },
        } : {}),
      },
      select: { id: true, usuario: true, nombre: true, rol: true, activo: true },
    });
    return { ...user, rol: user.rol as StaffUser['rol'], activo: user.activo ?? true };
  }

  private mapToUser(dbUser: Usuario): User {
    return {
      id: dbUser.id,
      usuario: dbUser.usuario,
      contrasena_hash: dbUser.contrasena_hash,
      nombre: dbUser.nombre,
      rol: dbUser.rol as 'admin' | 'vendedor' | 'almacen',
      activo: dbUser.activo ?? true,
      created_at: dbUser.created_at ?? new Date(),
      updated_at: dbUser.updated_at ?? new Date(),
    };
  }

  private mapToVendor(dbVendor: Vendedor): Vendor {
    return {
      id: dbVendor.id,
      usuario_id: dbVendor.usuario_id,
      nombre: dbVendor.nombre,
      telefono: dbVendor.telefono,
      avatar: dbVendor.avatar,
      activo: dbVendor.activo ?? true,
      created_at: dbVendor.created_at ?? new Date(),
      updated_at: dbVendor.updated_at ?? new Date(),
    };
  }

  async findUserById(id: string): Promise<User | null> {
    const user = await this.prisma.usuario.findUnique({ where: { id } });
    return user ? this.mapToUser(user) : null;
  }

  async findUserByUsername(username: string): Promise<User | null> {
    const user = await this.prisma.usuario.findUnique({ where: { usuario: username } });
    return user ? this.mapToUser(user) : null;
  }

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const created = await this.prisma.usuario.create({
      data: {
        usuario: user.usuario,
        contrasena_hash: user.contrasena_hash,
        nombre: user.nombre,
        rol: user.rol,
        activo: user.activo,
      },
    });
    return this.mapToUser(created);
  }

  async updateUser(
    id: string,
    user: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<User> {
    const updated = await this.prisma.usuario.update({
      where: { id },
      data: {
        usuario: user.usuario,
        contrasena_hash: user.contrasena_hash,
        nombre: user.nombre,
        rol: user.rol,
        activo: user.activo,
      },
    });
    return this.mapToUser(updated);
  }

  async findVendorById(id: string): Promise<Vendor | null> {
    const vendor = await this.prisma.vendedor.findUnique({ where: { id } });
    return vendor ? this.mapToVendor(vendor) : null;
  }

  async findVendorByUserId(userId: string): Promise<Vendor | null> {
    const vendor = await this.prisma.vendedor.findUnique({ where: { usuario_id: userId } });
    return vendor ? this.mapToVendor(vendor) : null;
  }

  async findAllVendors(): Promise<Vendor[]> {
    const vendors = await this.prisma.vendedor.findMany({
      orderBy: { nombre: 'asc' },
    });
    return vendors.map((v) => this.mapToVendor(v));
  }

  async createVendor(vendor: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor> {
    const created = await this.prisma.vendedor.create({
      data: {
        usuario_id: vendor.usuario_id,
        nombre: vendor.nombre,
        telefono: vendor.telefono,
        avatar: vendor.avatar,
        activo: vendor.activo,
      },
    });
    return this.mapToVendor(created);
  }

  async updateVendor(
    id: string,
    vendor: Partial<Omit<Vendor, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Vendor> {
    const updated = await this.prisma.vendedor.update({
      where: { id },
      data: {
        usuario_id: vendor.usuario_id,
        nombre: vendor.nombre,
        telefono: vendor.telefono,
        avatar: vendor.avatar,
        activo: vendor.activo,
      },
    });
    return this.mapToVendor(updated);
  }
}
