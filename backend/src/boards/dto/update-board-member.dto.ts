import { IsEnum } from 'class-validator';
import { BoardRole } from '@prisma/client';

export class UpdateBoardMemberDto {
  @IsEnum(BoardRole)
  role!: BoardRole;
}
