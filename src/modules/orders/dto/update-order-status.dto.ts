import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'loaded', 'route', 'delivered', 'failed'])
  estado: 'pending' | 'loaded' | 'route' | 'delivered' | 'failed';

  @IsString()
  @IsOptional()
  motivo_falla?: string;

  @IsString()
  @IsOptional()
  @IsIn(['efectivo', 'qr'])
  metodo_pago?: 'efectivo' | 'qr';
}
