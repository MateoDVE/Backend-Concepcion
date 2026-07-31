export interface Vendor {
  id: string;
  usuario_id: string | null;
  nombre: string;
  telefono: string | null;
  avatar: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}
