import { IsUUID, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderDetailDto } from './create-order.dto';

export class UpdateOrderDto {
  @IsUUID()
  @IsOptional()
  cliente_id?: string;

  @IsUUID()
  @IsOptional()
  vendedor_id?: string | null;

  @IsString()
  @IsOptional()
  estado?: 'pending' | 'loaded' | 'route' | 'delivered' | 'failed';

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderDetailDto)
  detalles?: OrderDetailDto[];
}
