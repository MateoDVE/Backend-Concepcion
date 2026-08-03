import { Injectable } from '@nestjs/common';
import { IClosingRepository } from '../../../domain/repositories/closing.repository.interface';
import { DailyClosing } from '../../../domain/entities/closing.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaClosingRepository implements IClosingRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToClosing(dbClosing: any): DailyClosing {
    return {
      id: dbClosing.id,
      fecha: dbClosing.fecha,
      vendedor_id: dbClosing.vendedor_id,
      total_pedidos: dbClosing.total_pedidos,
      entregados: dbClosing.entregados,
      fallidos: dbClosing.fallidos,
      total_sistema: Number(dbClosing.total_sistema),
      total_recaudado: Number(dbClosing.total_recaudado),
      diferencia: Number(dbClosing.diferencia),
      observaciones: dbClosing.observaciones,
      created_at: dbClosing.created_at ?? new Date(),
    };
  }

  async createClosing(closing: {
    fecha: Date;
    vendedor_id: string;
    total_pedidos: number;
    entregados: number;
    fallidos: number;
    total_sistema: number;
    total_recaudado: number;
    diferencia: number;
    observaciones: string | null;
  }): Promise<DailyClosing> {
    const created = await this.prisma.cierreDiario.create({
      data: {
        fecha: closing.fecha,
        vendedor_id: closing.vendedor_id,
        total_pedidos: closing.total_pedidos,
        entregados: closing.entregados,
        fallidos: closing.fallidos,
        total_sistema: closing.total_sistema,
        total_recaudado: closing.total_recaudado,
        diferencia: closing.diferencia,
        observaciones: closing.observaciones,
      },
    });
    return this.mapToClosing(created);
  }

  async findClosingByDateAndVendor(fecha: Date, vendedorId: string): Promise<DailyClosing | null> {
    // Formateamos la fecha a YYYY-MM-DD para la comparación en PostgreSQL DATE
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);

    const closing = await this.prisma.cierreDiario.findUnique({
      where: {
        fecha_vendedor_id: {
          fecha: startOfDay,
          vendedor_id: vendedorId,
        },
      },
    });
    return closing ? this.mapToClosing(closing) : null;
  }

  async getDailyReportOperativo(fecha: Date): Promise<any[]> {
    const startOfDay = new Date(fecha);
    startOfDay.setHours(0, 0, 0, 0);

    try {
      const results: any[] = await this.prisma.$queryRaw`
        SELECT * FROM v_reporte_diario_operativo;
      `;
      return results;
    } catch {
      // Si la vista no existe en Supabase, ejecutamos la consulta nativa equivalente
      const results: any[] = await this.prisma.$queryRaw`
        SELECT 
            ${startOfDay}::date AS fecha,
            v.id AS vendedor_id,
            v.nombre AS vendedor_nombre,
            COUNT(p.id)::int AS total_pedidos,
            SUM(CASE WHEN p.estado = 'delivered' THEN 1 ELSE 0 END)::int AS entregados,
            SUM(CASE WHEN p.estado = 'failed' THEN 1 ELSE 0 END)::int AS fallidos,
            SUM(CASE WHEN p.estado = 'route' THEN 1 ELSE 0 END)::int AS en_ruta,
            SUM(CASE WHEN p.estado = 'pending' THEN 1 ELSE 0 END)::int AS pendientes,
            COALESCE(SUM(CASE WHEN p.estado = 'delivered' THEN p.total ELSE 0 END), 0.00)::decimal AS total_sistema_entregado,
            COALESCE(cd.total_recaudado, COALESCE(SUM(CASE WHEN p.estado = 'delivered' THEN p.total ELSE 0 END), 0.00))::decimal AS total_recaudado,
            COALESCE(cd.diferencia, 0.00)::decimal AS diferencia,
            cd.observaciones
        FROM vendedores v
        LEFT JOIN pedidos p ON p.vendedor_id = v.id AND (p.fecha_creacion AT TIME ZONE 'America/La_Paz')::date = ${startOfDay}::date
        LEFT JOIN cierres_diarios cd ON cd.vendedor_id = v.id AND cd.fecha = ${startOfDay}::date
        WHERE v.activo = TRUE
        GROUP BY v.id, v.nombre, cd.total_recaudado, cd.diferencia, cd.observaciones;
      `;
      return results;
    }
  }

  async getGeneralReportHistorico(): Promise<any[]> {
    try {
      const results: any[] = await this.prisma.$queryRaw`
        SELECT * FROM v_reporte_general_historico;
      `;
      return results;
    } catch {
      // Si la vista no existe en Supabase, ejecutamos la consulta nativa equivalente
      const results: any[] = await this.prisma.$queryRaw`
        SELECT 
            fecha::text AS fecha,
            COUNT(DISTINCT vendedor_id)::int AS vendedores_activos,
            SUM(total_pedidos)::int AS total_pedidos,
            SUM(entregados)::int AS total_entregados,
            SUM(fallidos)::int AS total_fallidos,
            SUM(total_sistema)::decimal AS total_ventas_sistema,
            SUM(total_recaudado)::decimal AS total_ventas_recaudado,
            SUM(diferencia)::decimal AS total_diferencias,
            ROUND((SUM(entregados)::decimal / NULLIF(SUM(total_pedidos), 0)) * 100, 2)::decimal AS porcentaje_efectividad,
            'CERRADO' AS tipo_registro
        FROM cierres_diarios
        GROUP BY fecha
        
        UNION ALL
        
        SELECT 
            (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date::text AS fecha,
            COUNT(DISTINCT vendedor_id)::int AS vendedores_activos,
            COUNT(id)::int AS total_pedidos,
            SUM(CASE WHEN estado = 'delivered' THEN 1 ELSE 0 END)::int AS total_entregados,
            SUM(CASE WHEN estado = 'failed' THEN 1 ELSE 0 END)::int AS total_fallidos,
            COALESCE(SUM(CASE WHEN estado = 'delivered' THEN total ELSE 0 END), 0.00)::decimal AS total_ventas_sistema,
            0.00 AS total_ventas_recaudado,
            0.00 AS total_diferencias,
            ROUND((SUM(CASE WHEN estado = 'delivered' THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(id), 0)) * 100, 2)::decimal AS porcentaje_efectividad,
            'EN_CURSO' AS tipo_registro
        FROM pedidos
        WHERE (fecha_creacion AT TIME ZONE 'America/La_Paz')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date
          AND vendedor_id IS NOT NULL
        GROUP BY (CURRENT_TIMESTAMP AT TIME ZONE 'America/La_Paz')::date::text
        ORDER BY fecha DESC;
      `;
      return results;
    }
  }
}
