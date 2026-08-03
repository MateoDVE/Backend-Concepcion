export interface Client {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  ubicacion_url: string | null;
  tipo_cliente: string | null;
  creado_por_id: string | null;
  creado_por_nombre?: string | null;
  actualizado_por_id: string | null;
  actualizado_por_nombre?: string | null;
  created_at: Date;
  updated_at: Date;
}
