import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateStaffDto {
  @Transform(trim)
  @IsString()
  @Length(1, 150)
  nombre: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-z0-9._-]+$/)
  usuario: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @Length(8, 72)
  password: string;

  @IsIn(['vendedor', 'almacen'])
  rol: 'vendedor' | 'almacen';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  telefono?: string;
}
