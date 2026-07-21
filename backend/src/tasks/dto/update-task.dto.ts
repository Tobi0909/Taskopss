import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';
import { BlockedState, Priority } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsEnum(BlockedState)
  blockedState?: BlockedState;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  blockedReason?: string | null;
}
