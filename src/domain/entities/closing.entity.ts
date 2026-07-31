export interface DailyClosing {
  id: string;
  fecha: Date;
  vendedor_id: string;
  total_pedidos: number;
  entregados: number;
  fallidos: number;
  total_sistema: number;
  total_recaudado: number;
  diferencia: number;
  observaciones: string | null;
  created_at: Date;
}
