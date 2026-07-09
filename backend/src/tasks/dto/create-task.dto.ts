import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Priority } from '@prisma/client';

export class CreateTaskDto {
  @IsUUID()
  boardId!: string;

  @IsUUID()
  columnId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
