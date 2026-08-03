import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('admin' | 'vendedor' | 'almacen')[]) => SetMetadata(ROLES_KEY, roles);
