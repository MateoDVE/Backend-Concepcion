import { IsInt, IsNotEmpty } from 'class-validator';

export class UpdateStockDto {
  @IsInt()
  @IsNotEmpty()
  cantidad: number;
}
