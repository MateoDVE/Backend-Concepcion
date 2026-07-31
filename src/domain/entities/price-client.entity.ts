export interface PriceClient {
  id: string;
  cliente_id: string;
  producto_id: string;
  precio_especial: number;
  created_at: Date;
  updated_at: Date;
}
