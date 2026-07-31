import { CreateVendorDto } from './create-vendor.dto';

// PartialType is in @nestjs/mapped-types, let's make sure it's installed or write it manually to avoid issues.
// Let's just define the fields explicitly to keep it simple and not rely on another packages.
import { IsString, IsOptional, IsUUID, IsBoolean, Length } from 'class-validator';

export class UpdateVendorDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  @Length(1, 10)
  avatar?: string;

  @IsUUID()
  @IsOptional()
  usuario_id?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
