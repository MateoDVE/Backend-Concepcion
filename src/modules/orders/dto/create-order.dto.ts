import { IsUUID, IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested, IsInt, IsNumber, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderDetailDto {
  @IsUUID()
  @IsNotEmpty()
  producto_id: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  cantidad: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  precio_aplicado?: number; // Opcional, si no se envía se calcula el precio sugerido
}

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  cliente_id: string;

  @IsUUID()
  @IsOptional()
  vendedor_id?: string;

  @IsString()
  @IsOptional()
  estado?: 'pending' | 'loaded' | 'route' | 'delivered' | 'failed';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderDetailDto)
  detalles: OrderDetailDto[];
}
