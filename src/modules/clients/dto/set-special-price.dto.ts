import { IsUUID, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class SetSpecialPriceDto {
  @IsUUID()
  @IsNotEmpty()
  producto_id: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  precio_especial: number;
}
