import { applyDecorators, SetMetadata } from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { BoardIdResolver } from '../board-id-resolvers';

export const BOARD_MIN_ROLE_KEY = 'boardMinRole';
export const BOARD_ID_RESOLVER_KEY = 'boardIdResolver';

/**
 * Requires the caller to be a board member with at least `minRole` on the board
 * resolved by `resolveBoardId`. Global `Role.ADMIN` users always bypass this check.
 */
export const BoardRoles = (minRole: BoardRole, resolveBoardId: BoardIdResolver) =>
  applyDecorators(
    SetMetadata(BOARD_MIN_ROLE_KEY, minRole),
    SetMetadata(BOARD_ID_RESOLVER_KEY, resolveBoardId),
  );
