import { IsDateString, Matches, MaxLength, IsUUID, IsOptional, IsString, IsArray, ArrayUnique, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderDetailDto } from './create-order.dto';

export class UpdateOrderDto {
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_programada?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string | null;

  @IsUUID()
  @IsOptional()
  cliente_id?: string;

  @IsUUID()
  @IsOptional()
  vendedor_id?: string | null;

  @IsString()
  @IsOptional()
  estado?: 'pending' | 'loaded' | 'route' | 'delivered' | 'failed';

  @IsString()
  @IsOptional()
  @IsIn(['efectivo', 'qr'])
  metodo_pago?: 'efectivo' | 'qr';

  @IsArray()
  @ArrayUnique((detail: OrderDetailDto) => detail?.producto_id, { message: 'Cada producto debe aparecer una sola vez. Suma sus cantidades en una misma fila.' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderDetailDto)
  detalles?: OrderDetailDto[];
}
