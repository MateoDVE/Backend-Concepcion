import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SpecialPriceDto {
  @IsString()
  @IsNotEmpty()
  producto_id: string;

  @IsNumber()
  @Min(0)
  precio_especial: number;
}

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsString()
  @IsNotEmpty()
  direccion: string;

  @IsString()
  @IsOptional()
  ubicacion_url?: string;

  @IsString()
  @IsOptional()
  tipo_cliente?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SpecialPriceDto)
  precios_especiales?: SpecialPriceDto[];
}
