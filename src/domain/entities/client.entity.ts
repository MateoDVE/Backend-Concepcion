export interface Client {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  ubicacion_url: string | null;
  created_at: Date;
  updated_at: Date;
}
