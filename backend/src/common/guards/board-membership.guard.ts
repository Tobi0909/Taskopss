import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BoardRole, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/types/auth.types';
import { BOARD_ID_RESOLVER_KEY, BOARD_MIN_ROLE_KEY } from '../decorators/board-roles.decorator';
import { BoardIdResolver } from '../board-id-resolvers';
import { meetsMinimumBoardRole } from '../board-role-rank';

@Injectable()
export class BoardMembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minRole = this.reflector.getAllAndOverride<BoardRole | undefined>(BOARD_MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!minRole) {
      return true;
    }
    const resolveBoardId = this.reflector.getAllAndOverride<BoardIdResolver | undefined>(
      BOARD_ID_RESOLVER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
    if (user.role === Role.ADMIN) {
      return true;
    }

    const boardId = resolveBoardId ? await resolveBoardId(request, this.prisma) : null;
    if (!boardId) {
      // Referenced entity doesn't exist (or route isn't board-scoped after all) —
      // let the request through; the service layer will 404 on the missing entity.
      return true;
    }

    const membership = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: user.id } },
    });
    if (!membership || !meetsMinimumBoardRole(membership.role, minRole)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này trên board này');
    }
    return true;
  }
}
