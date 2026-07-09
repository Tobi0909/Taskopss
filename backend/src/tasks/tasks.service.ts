import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityAction, Prisma, Priority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { SetTaskTagsDto } from './dto/set-task-tags.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import {
  TASK_EVENTS,
  TaskAssignedEvent,
  TaskChangedEvent,
  TaskCreatedEvent,
  TaskStatusChangedEvent,
} from './tasks.events';

const taskInclude = {
  board: { select: { keyPrefix: true } },
  column: { select: { id: true, name: true, isDoneColumn: true } },
  assignee: { select: { id: true, name: true, avatarColor: true } },
  createdBy: { select: { id: true, name: true } },
  tags: { include: { tag: true } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TaskInclude;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function mapTask(task: TaskWithRelations) {
  return {
    id: task.id,
    key: `${task.board.keyPrefix}-${task.sequenceNumber}`,
    boardId: task.boardId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    position: task.position,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    column: task.column,
    assignee: task.assignee,
    createdBy: task.createdBy,
    tags: task.tags.map((t) => t.tag),
    commentCount: task._count.comments,
    attachmentCount: task._count.attachments,
  };
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(query: QueryTasksDto) {
    const where: Prisma.TaskWhereInput = {};
    if (query.boardId) where.boardId = query.boardId;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.priority) where.priority = query.priority;
    if (query.tagId) where.tags = { some: { tagId: query.tagId } };
    if (query.q) where.title = { contains: query.q, mode: 'insensitive' };
    if (query.overdue) {
      where.dueDate = { lt: new Date() };
      where.completedAt = null;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ columnId: 'asc' }, { position: 'asc' }],
    });
    return tasks.map(mapTask);
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: taskInclude });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }
    return mapTask(task);
  }

  async getActivityLog(taskId: string) {
    const exists = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!exists) {
      throw new NotFoundException('Không tìm thấy task');
    }
    return this.prisma.activityLog.findMany({
      where: { taskId },
      include: { actor: { select: { id: true, name: true, avatarColor: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateTaskDto, actorId: string) {
    const column = await this.prisma.boardColumn.findUnique({ where: { id: dto.columnId } });
    if (!column) {
      throw new NotFoundException('Không tìm thấy cột');
    }
    if (column.boardId !== dto.boardId) {
      throw new BadRequestException('Cột không thuộc board đã chọn');
    }
    if (dto.assigneeId) {
      await this.assertAssigneeValid(dto.assigneeId);
    }

    const topTask = await this.prisma.task.findFirst({
      where: { columnId: dto.columnId },
      orderBy: { position: 'asc' },
    });
    const position = topTask ? topTask.position - 1 : 1;

    const created = await this.prisma.$transaction(async (tx) => {
      const board = await tx.board.update({
        where: { id: dto.boardId },
        data: { taskCounter: { increment: 1 } },
      });
      const task = await tx.task.create({
        data: {
          boardId: dto.boardId,
          columnId: dto.columnId,
          sequenceNumber: board.taskCounter,
          title: dto.title,
          description: dto.description ?? '',
          priority: dto.priority ?? Priority.P3,
          assigneeId: dto.assigneeId,
          createdById: actorId,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          position,
          tags:
            dto.tagIds && dto.tagIds.length > 0
              ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
              : undefined,
        },
      });
      await tx.activityLog.create({
        data: { taskId: task.id, actorId, action: ActivityAction.CREATED, metadata: {} },
      });
      return task;
    });

    this.eventEmitter.emit(TASK_EVENTS.CREATED, {
      taskId: created.id,
      actorId,
    } satisfies TaskCreatedEvent);
    if (created.assigneeId) {
      this.eventEmitter.emit(TASK_EVENTS.ASSIGNED, {
        taskId: created.id,
        assigneeId: created.assigneeId,
        actorId,
      } satisfies TaskAssignedEvent);
    }
    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: created.id,
      boardId: created.boardId,
    } satisfies TaskChangedEvent);

    return this.findOne(created.id);
  }

  async update(id: string, dto: UpdateTaskDto, actorId: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy task');
    }
    if (dto.assigneeId) {
      await this.assertAssigneeValid(dto.assigneeId);
    }

    const activityEntries: Prisma.ActivityLogCreateManyInput[] = [];

    if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
      activityEntries.push({
        taskId: id,
        actorId,
        action: dto.assigneeId ? ActivityAction.ASSIGNED : ActivityAction.UNASSIGNED,
        metadata: { from: existing.assigneeId, to: dto.assigneeId },
      });
    }
    if (dto.priority !== undefined && dto.priority !== existing.priority) {
      activityEntries.push({
        taskId: id,
        actorId,
        action: ActivityAction.PRIORITY_CHANGED,
        metadata: { from: existing.priority, to: dto.priority },
      });
    }
    if (dto.dueDate !== undefined) {
      const newDue = dto.dueDate ? new Date(dto.dueDate) : null;
      const oldDueIso = existing.dueDate ? existing.dueDate.toISOString() : null;
      const newDueIso = newDue ? newDue.toISOString() : null;
      if (oldDueIso !== newDueIso) {
        activityEntries.push({
          taskId: id,
          actorId,
          action: ActivityAction.DUE_DATE_CHANGED,
          metadata: { from: oldDueIso, to: newDueIso },
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          assigneeId: dto.assigneeId,
          dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
        },
      });
      if (activityEntries.length > 0) {
        await tx.activityLog.createMany({ data: activityEntries });
      }
    });

    if (dto.assigneeId) {
      this.eventEmitter.emit(TASK_EVENTS.ASSIGNED, {
        taskId: id,
        assigneeId: dto.assigneeId,
        actorId,
      } satisfies TaskAssignedEvent);
    }
    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: id,
      boardId: existing.boardId,
    } satisfies TaskChangedEvent);

    return this.findOne(id);
  }

  async move(id: string, dto: MoveTaskDto, actorId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }
    const targetColumn = await this.prisma.boardColumn.findUnique({ where: { id: dto.columnId } });
    if (!targetColumn) {
      throw new NotFoundException('Không tìm thấy cột');
    }
    if (targetColumn.boardId !== task.boardId) {
      throw new BadRequestException('Cột không thuộc board của task');
    }

    const siblings = await this.prisma.task.findMany({
      where: { columnId: dto.columnId, id: { not: id } },
      orderBy: { position: 'asc' },
    });

    let newPosition: number;
    if (!dto.afterTaskId) {
      newPosition = siblings.length > 0 ? siblings[0].position - 1 : 1;
    } else {
      const afterIndex = siblings.findIndex((t) => t.id === dto.afterTaskId);
      if (afterIndex === -1) {
        throw new BadRequestException('afterTaskId không hợp lệ trong cột này');
      }
      const afterTask = siblings[afterIndex];
      const nextTask = siblings[afterIndex + 1];
      newPosition = nextTask ? (afterTask.position + nextTask.position) / 2 : afterTask.position + 1;
    }

    const statusChanged = task.columnId !== dto.columnId;
    let completedAt: Date | null | undefined;
    if (targetColumn.isDoneColumn) {
      completedAt = task.completedAt ?? new Date();
    } else {
      completedAt = statusChanged ? null : undefined;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: { columnId: dto.columnId, position: newPosition, completedAt },
      });
      if (statusChanged) {
        await tx.activityLog.create({
          data: {
            taskId: id,
            actorId,
            action: ActivityAction.STATUS_CHANGED,
            metadata: { from: task.columnId, to: dto.columnId },
          },
        });
      }
    });

    if (statusChanged) {
      this.eventEmitter.emit(TASK_EVENTS.STATUS_CHANGED, {
        taskId: id,
        fromColumnId: task.columnId,
        toColumnId: dto.columnId,
        actorId,
      } satisfies TaskStatusChangedEvent);
    }
    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: id,
      boardId: task.boardId,
    } satisfies TaskChangedEvent);

    return this.findOne(id);
  }

  async setTags(id: string, dto: SetTaskTagsDto, actorId: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: { tags: true } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }

    const currentTagIds = new Set(task.tags.map((t) => t.tagId));
    const newTagIds = new Set(dto.tagIds);
    const toAdd = dto.tagIds.filter((tagId) => !currentTagIds.has(tagId));
    const toRemove = [...currentTagIds].filter((tagId) => !newTagIds.has(tagId));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return this.findOne(id);
    }

    const affectedTags = await this.prisma.tag.findMany({
      where: { id: { in: [...toAdd, ...toRemove] } },
    });
    const tagNameById = new Map(affectedTags.map((t) => [t.id, t.name]));

    await this.prisma.$transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx.taskTag.deleteMany({ where: { taskId: id, tagId: { in: toRemove } } });
      }
      if (toAdd.length > 0) {
        await tx.taskTag.createMany({ data: toAdd.map((tagId) => ({ taskId: id, tagId })) });
      }
      const logs: Prisma.ActivityLogCreateManyInput[] = [
        ...toAdd.map((tagId) => ({
          taskId: id,
          actorId,
          action: ActivityAction.TAG_ADDED,
          metadata: { tagId, name: tagNameById.get(tagId) },
        })),
        ...toRemove.map((tagId) => ({
          taskId: id,
          actorId,
          action: ActivityAction.TAG_REMOVED,
          metadata: { tagId, name: tagNameById.get(tagId) },
        })),
      ];
      if (logs.length > 0) {
        await tx.activityLog.createMany({ data: logs });
      }
    });

    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: id,
      boardId: task.boardId,
    } satisfies TaskChangedEvent);

    return this.findOne(id);
  }

  async remove(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }
    await this.prisma.task.delete({ where: { id } });
    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: id,
      boardId: task.boardId,
    } satisfies TaskChangedEvent);
  }

  private async assertAssigneeValid(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new BadRequestException('Người phụ trách không hợp lệ');
    }
  }
}
