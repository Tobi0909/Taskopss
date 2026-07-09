import { IsOptional, IsUUID } from 'class-validator';

export class MoveTaskDto {
  @IsUUID()
  columnId!: string;

  @IsOptional()
  @IsUUID()
  afterTaskId?: string;
}
