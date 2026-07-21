import { IsEnum, IsUUID } from 'class-validator';
import { BoardRole } from '@prisma/client';

export class AddBoardMemberDto {
  @IsUUID()
  userId!: string;

  @IsEnum(BoardRole)
  role!: BoardRole;
}
