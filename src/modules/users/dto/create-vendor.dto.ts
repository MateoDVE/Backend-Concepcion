import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, Length } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  avatar: string;

  @IsUUID()
  @IsOptional()
  usuario_id?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
