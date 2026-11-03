import { BadRequestException, ConflictException, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { USER_REPOSITORY_TOKEN } from '../../domain/repositories/tokens';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { CreateStaffDto } from './dto/create-staff.dto';

@Injectable()
export class StaffService {
  private adminClient?: SupabaseClient;
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private readonly users: IUserRepository,
    private readonly config: ConfigService,
  ) {}

  private get auth() {
    if (!this.adminClient) {
      const url = this.config.get<string>('SUPABASE_URL');
      const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key) throw new ServiceUnavailableException('La creación de cuentas no está configurada. Contacta al responsable del sistema.');
      this.adminClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
    }
    return this.adminClient.auth.admin;
  }

  list() { return this.users.findAllStaff(); }

  async setStatus(id: string, activo: boolean) {
    await this.users.setStaffStatus(id, activo);
    return { id, activo };
  }

  async create(dto: CreateStaffDto) {
    if (await this.users.findUserByUsername(dto.usuario)) {
      throw new ConflictException('El nombre de usuario ya está registrado.');
    }
    const auth = this.auth;
    const { data, error } = await auth.createUser({
      email: dto.email, password: dto.password, email_confirm: true,
    });
    if (error) {
      if (['email_exists', 'user_already_exists'].includes(error.code ?? '')) {
        throw new ConflictException('El correo electrónico ya está registrado.');
      }
      if (error.status && error.status < 500) {
        throw new BadRequestException('Revisa el correo y la contraseña. La contraseña debe cumplir la política de seguridad del sistema.');
      }
      throw new ServiceUnavailableException('No se pudo crear la cuenta de acceso. Inténtalo más tarde.');
    }
    if (!data.user) throw new ServiceUnavailableException('No se pudo crear la cuenta de acceso.');
    try {
      return await this.users.createStaff({
        id: data.user.id, nombre: dto.nombre, usuario: dto.usuario,
        rol: dto.rol, telefono: dto.telefono,
      });
    } catch (cause) {
      // Compensate only the identity created by this request, never an existing account.
      try {
        const cleanup = await auth.deleteUser(data.user.id);
        if (cleanup.error) throw cleanup.error;
      } catch {
        this.logger.error(`No se pudo revertir la cuenta de acceso ${data.user.id}; requiere conciliación.`);
        throw new ServiceUnavailableException('No se completó el registro. Contacta al responsable del sistema antes de reintentar.');
      }
      if ((cause as { code?: string }).code === 'P2002') {
        throw new ConflictException('El nombre de usuario ya está registrado.');
      }
      throw new ServiceUnavailableException('No se pudo guardar el usuario. La cuenta de acceso fue revertida; puedes reintentar.');
    }
  }
}
