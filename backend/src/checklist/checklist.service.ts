import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { ReorderChecklistItemDto } from './dto/reorder-checklist-item.dto';
import { TASK_EVENTS, TaskChangedEvent } from '../tasks/tasks.events';

@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllForTask(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }
    return this.prisma.checklistItem.findMany({
      where: { taskId },
      orderBy: { position: 'asc' },
    });
  }

  async create(taskId: string, dto: CreateChecklistItemDto, actorId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }

    const last = await this.prisma.checklistItem.findFirst({
      where: { taskId },
      orderBy: { position: 'desc' },
    });
    const position = (last?.position ?? -1) + 1;

    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.checklistItem.create({
        data: { taskId, text: dto.text, position },
      });
      await tx.activityLog.create({
        data: {
          taskId,
          actorId,
          action: ActivityAction.CHECKLIST_ITEM_ADDED,
          metadata: { text: dto.text },
        },
      });
      return created;
    });

    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId,
      boardId: task.boardId,
    } satisfies TaskChangedEvent);

    return item;
  }

  async update(id: string, dto: UpdateChecklistItemDto, actorId: string) {
    const existing = await this.prisma.checklistItem.findUnique({
      where: { id },
      include: { task: { select: { boardId: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy mục checklist');
    }

    const isToggling = dto.isDone !== undefined && dto.isDone !== existing.isDone;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.checklistItem.update({
        where: { id },
        data: { text: dto.text, isDone: dto.isDone },
      });
      if (isToggling) {
        await tx.activityLog.create({
          data: {
            taskId: existing.taskId,
            actorId,
            action: ActivityAction.CHECKLIST_ITEM_TOGGLED,
            metadata: { text: result.text, isDone: result.isDone },
          },
        });
      }
      return result;
    });

    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: existing.taskId,
      boardId: existing.task.boardId,
    } satisfies TaskChangedEvent);

    return updated;
  }

  async reorder(id: string, dto: ReorderChecklistItemDto) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Không tìm thấy mục checklist');
    }

    const siblings = await this.prisma.checklistItem.findMany({
      where: { taskId: item.taskId, id: { not: id } },
      orderBy: { position: 'asc' },
    });

    let newPosition: number;
    if (!dto.afterItemId) {
      newPosition = siblings.length > 0 ? siblings[0].position - 1 : 1;
    } else {
      const afterIndex = siblings.findIndex((s) => s.id === dto.afterItemId);
      if (afterIndex === -1) {
        throw new BadRequestException('afterItemId không hợp lệ trong checklist này');
      }
      const afterItem = siblings[afterIndex];
      const nextItem = siblings[afterIndex + 1];
      newPosition = nextItem ? (afterItem.position + nextItem.position) / 2 : afterItem.position + 1;
    }

    return this.prisma.checklistItem.update({ where: { id }, data: { position: newPosition } });
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.checklistItem.findUnique({
      where: { id },
      include: { task: { select: { boardId: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy mục checklist');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.checklistItem.delete({ where: { id } });
      await tx.activityLog.create({
        data: {
          taskId: existing.taskId,
          actorId,
          action: ActivityAction.CHECKLIST_ITEM_REMOVED,
          metadata: { text: existing.text },
        },
      });
    });

    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: existing.taskId,
      boardId: existing.task.boardId,
    } satisfies TaskChangedEvent);
  }
}
