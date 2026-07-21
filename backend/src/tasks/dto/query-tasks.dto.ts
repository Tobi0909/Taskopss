import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { BlockedState, Priority } from '@prisma/client';

export class QueryTasksDto {
  @IsOptional()
  @IsUUID()
  boardId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @IsOptional()
  @IsUUID()
  columnId?: string;

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

  @IsOptional()
  @IsBoolean()
  dueToday?: boolean;

  @IsOptional()
  @IsBoolean()
  dueThisWeek?: boolean;

  @IsOptional()
  @IsBoolean()
  createdToday?: boolean;

  @IsOptional()
  @IsBoolean()
  hasAttachment?: boolean;

  @IsOptional()
  @IsBoolean()
  hasComment?: boolean;

  @IsOptional()
  @IsBoolean()
  hasChecklist?: boolean;

  @IsOptional()
  @IsEnum(BlockedState)
  blockedState?: BlockedState;

  @IsOptional()
  @IsBoolean()
  blocked?: boolean;
}
