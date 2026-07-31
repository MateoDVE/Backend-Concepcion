import { IsUUID, IsNotEmpty, IsInt, IsNumber, Min, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateClosingDto {
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @IsUUID()
  @IsNotEmpty()
  vendedor_id: string;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  total_pedidos: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  entregados: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  fallidos: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  total_sistema: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  total_recaudado: number;

  @IsNumber()
  @IsNotEmpty()
  diferencia: number;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
