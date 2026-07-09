import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.board.findMany({
      select: { id: true, name: true, keyPrefix: true },
      orderBy: { name: 'asc' },
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
