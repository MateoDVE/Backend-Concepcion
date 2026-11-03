import { ArrayMinSize, ArrayUnique, IsArray, IsDateString, IsUUID, Matches } from 'class-validator';

export class ReorderRouteDto {
  @IsUUID()
  vendedor_id: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  order_ids: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  previous_order_ids: string[];
}
