import { DailyClosing } from '../entities/closing.entity';

export interface IClosingRepository {
  createClosing(closing: {
    fecha: Date;
    vendedor_id: string;
    total_pedidos: number;
    entregados: number;
    fallidos: number;
    total_sistema: number;
    total_recaudado: number;
    diferencia: number;
    observaciones: string | null;
  }): Promise<DailyClosing>;
  findClosingByDateAndVendor(fecha: Date, vendedorId: string): Promise<DailyClosing | null>;
  getDailyReportOperativo(fecha: Date): Promise<any[]>;
  getGeneralReportHistorico(): Promise<any[]>;
}
