import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, BoardRole, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { UpdateBoardMemberDto } from './dto/update-board-member.dto';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(userId: string, globalRole: Role) {
    return this.prisma.board.findMany({
      where: globalRole === Role.ADMIN ? undefined : { members: { some: { userId } } },
      select: { id: true, name: true, keyPrefix: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateBoardDto, creatorId: string) {
    const existing = await this.prisma.board.findUnique({ where: { keyPrefix: dto.keyPrefix } });
    if (existing) {
      throw new ConflictException('keyPrefix này đã được sử dụng');
    }
    const board = await this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: { name: dto.name, keyPrefix: dto.keyPrefix, createdById: creatorId },
      });
      await tx.boardMember.create({
        data: { boardId: board.id, userId: creatorId, role: BoardRole.OWNER },
      });
      return board;
    });
    await this.auditLog.record(creatorId, AuditAction.BOARD_CREATED, 'Board', board.id, {
      name: board.name,
      keyPrefix: board.keyPrefix,
    });
    return board;
  }

  async remove(id: string, actorId: string) {
    const board = await this.prisma.board.findUnique({ where: { id } });
    if (!board) {
      throw new NotFoundException('Không tìm thấy board');
    }
    await this.prisma.board.delete({ where: { id } });
    await this.auditLog.record(actorId, AuditAction.BOARD_DELETED, 'Board', id, {
      name: board.name,
      keyPrefix: board.keyPrefix,
    });
  }

  async listMembers(boardId: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Không tìm thấy board');
    }
    return this.prisma.boardMember.findMany({
      where: { boardId },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(boardId: string, dto: AddBoardMemberDto, actorId: string) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Không tìm thấy board');
    }
    const existing = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: dto.userId } },
    });
    if (existing) {
      throw new ConflictException('Người dùng này đã là thành viên của board');
    }
    const member = await this.prisma.boardMember.create({
      data: { boardId, userId: dto.userId, role: dto.role },
    });
    await this.auditLog.record(actorId, AuditAction.BOARD_MEMBER_ADDED, 'BoardMember', member.id, {
      boardId,
      userId: dto.userId,
      role: dto.role,
    });
    return member;
  }

  async updateMemberRole(boardId: string, userId: string, dto: UpdateBoardMemberDto, actorId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên trong board này');
    }
    const updated = await this.prisma.boardMember.update({
      where: { boardId_userId: { boardId, userId } },
      data: { role: dto.role },
    });
    await this.auditLog.record(
      actorId,
      AuditAction.BOARD_MEMBER_ROLE_CHANGED,
      'BoardMember',
      member.id,
      { boardId, userId, fromRole: member.role, toRole: dto.role },
    );
    return updated;
  }

  async removeMember(boardId: string, userId: string, actorId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên trong board này');
    }
    await this.prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
    await this.auditLog.record(actorId, AuditAction.BOARD_MEMBER_REMOVED, 'BoardMember', member.id, {
      boardId,
      userId,
      role: member.role,
    });
  }

  async findOneWithColumns(id: string) {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: { columns: { orderBy: { position: 'asc' } } },
    });
    if (!board) {
      throw new NotFoundException('Không tìm thấy board');
    }
    return board;
  }

  async createColumn(boardId: string, dto: CreateBoardColumnDto) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Không tìm thấy board');
    }

    let position = dto.position;
    if (position === undefined) {
      const last = await this.prisma.boardColumn.findFirst({
        where: { boardId },
        orderBy: { position: 'desc' },
      });
      position = (last?.position ?? -1) + 1;
    }

    return this.prisma.boardColumn.create({
      data: {
        boardId,
        name: dto.name,
        position,
        isDoneColumn: dto.isDoneColumn ?? false,
      },
    });
  }

  async updateColumn(columnId: string, dto: UpdateBoardColumnDto) {
    const column = await this.prisma.boardColumn.findUnique({ where: { id: columnId } });
    if (!column) {
      throw new NotFoundException('Không tìm thấy cột');
    }
    return this.prisma.boardColumn.update({
      where: { id: columnId },
      data: {
        name: dto.name,
        position: dto.position,
        isDoneColumn: dto.isDoneColumn,
      },
    });
  }

  async removeColumn(columnId: string) {
    const column = await this.prisma.boardColumn.findUnique({ where: { id: columnId } });
    if (!column) {
      throw new NotFoundException('Không tìm thấy cột');
    }
    const taskCount = await this.prisma.task.count({ where: { columnId } });
    if (taskCount > 0) {
      throw new ConflictException(
        `Cột đang có ${taskCount} task, hãy chuyển hết task sang cột khác trước khi xoá`,
      );
    }
    await this.prisma.boardColumn.delete({ where: { id: columnId } });
  }
}
