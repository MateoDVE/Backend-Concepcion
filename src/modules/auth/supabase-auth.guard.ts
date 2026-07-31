import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseAuthService } from './supabase-auth.service';
import { USER_REPOSITORY_TOKEN } from '../../domain/repositories/tokens';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseAuthService: SupabaseAuthService,
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Encabezado de autorización ausente');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato de token Bearer inválido');
    }

    try {
      // Validar token con Supabase Auth
      const supabaseUser = await this.supabaseAuthService.validateToken(token);

      // Buscar el usuario en nuestra tabla local de usuarios por su id (UUID)
      const dbUser = await this.userRepo.findUserById(supabaseUser.id);
      if (!dbUser) {
        throw new UnauthorizedException(
          `Usuario no registrado en la base de datos de la distribuidora (ID: ${supabaseUser.id})`,
        );
      }

      if (!dbUser.activo) {
        throw new UnauthorizedException('El usuario se encuentra inactivo');
      }

      // Adjuntar el perfil completo al request
      request.user = {
        id: dbUser.id,
        usuario: dbUser.usuario,
        nombre: dbUser.nombre,
        rol: dbUser.rol,
        activo: dbUser.activo,
        email: supabaseUser.email,
      };

      return true;
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'No autorizado');
    }
  }
}
