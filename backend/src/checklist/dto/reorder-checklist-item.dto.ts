import { IsOptional, IsUUID } from 'class-validator';

export class ReorderChecklistItemDto {
  @IsOptional()
  @IsUUID()
  afterItemId?: string;
}
