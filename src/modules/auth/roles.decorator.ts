import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('admin' | 'vendedor')[]) => SetMetadata(ROLES_KEY, roles);
