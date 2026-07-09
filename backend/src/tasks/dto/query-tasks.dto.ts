import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Priority } from '@prisma/client';

export class QueryTasksDto {
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsUUID()
  tagId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBoolean()
  overdue?: boolean;
}
