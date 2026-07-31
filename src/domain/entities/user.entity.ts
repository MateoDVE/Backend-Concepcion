export interface User {
  id: string;
  usuario: string;
  contrasena_hash: string;
  nombre: string;
  rol: 'admin' | 'vendedor';
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}
