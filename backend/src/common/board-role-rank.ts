import { BoardRole } from '@prisma/client';

export const BOARD_ROLE_RANK: Record<BoardRole, number> = {
  [BoardRole.VIEWER]: 0,
  [BoardRole.MEMBER]: 1,
  [BoardRole.ADMIN]: 2,
  [BoardRole.OWNER]: 3,
};

export const meetsMinimumBoardRole = (role: BoardRole, minRole: BoardRole): boolean =>
  BOARD_ROLE_RANK[role] >= BOARD_ROLE_RANK[minRole];
