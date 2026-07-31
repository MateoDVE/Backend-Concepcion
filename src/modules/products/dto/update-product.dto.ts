import { IsString, IsNumber, Min, IsOptional, IsInt } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  precio_base?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @IsString()
  @IsOptional()
  unidad?: string;
}
