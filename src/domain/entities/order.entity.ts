export interface OrderDetail {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  precio_aplicado: number;
  producto?: {
    nombre: string;
    unidad: string;
  };
}

export interface Order {
  id: string;
  codigo: string;
  cliente_id: string;
  vendedor_id: string | null;
  estado: 'pending' | 'loaded' | 'route' | 'delivered' | 'failed';
  total: number;
  motivo_falla: string | null;
  fecha_creacion: Date;
  fecha_entrega: Date | null;
  updated_at: Date;
  
  cliente?: {
    nombre: string;
    telefono: string;
    direccion: string;
    ubicacion_url: string | null;
  };
  vendedor?: {
    nombre: string;
    telefono: string | null;
    avatar: string;
  };
  detalles?: OrderDetail[];
}
