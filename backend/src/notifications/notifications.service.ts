import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TASK_EVENTS, TaskAssignedEvent, TaskStatusChangedEvent } from '../tasks/tasks.events';
import { COMMENT_EVENTS, CommentCreatedEvent, CommentMentionedEvent } from '../comments/comments.events';

const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
    return { count };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }
    if (notification.recipientId !== userId) {
      throw new ForbiddenException('Không thể thao tác trên thông báo của người khác');
    }
    await this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }

  private async createNotification(data: {
    recipientId: string;
    type: NotificationType;
    taskId?: string;
    commentId?: string;
    message: string;
  }) {
    const notification = await this.prisma.notification.create({ data });
    this.eventEmitter.emit('notification.created', notification);
    return notification;
  }

  @OnEvent(TASK_EVENTS.ASSIGNED)
  async handleTaskAssigned(payload: TaskAssignedEvent) {
    if (!payload.actorId || payload.assigneeId === payload.actorId) {
      return;
    }
    const task = await this.prisma.task.findUnique({
      where: { id: payload.taskId },
      include: { board: true },
    });
    if (!task) {
      return;
    }
    const actorName = await this.getActorName(payload.actorId);
    await this.createNotification({
      recipientId: payload.assigneeId,
      type: NotificationType.ASSIGNED,
      taskId: payload.taskId,
      message: `${actorName} đã gán bạn vào task "${task.title}" (${task.board.keyPrefix}-${task.sequenceNumber})`,
    });
  }

  @OnEvent(TASK_EVENTS.STATUS_CHANGED)
  async handleTaskStatusChanged(payload: TaskStatusChangedEvent) {
    const task = await this.prisma.task.findUnique({ where: { id: payload.taskId } });
    if (!task || !task.assigneeId || task.assigneeId === payload.actorId) {
      return;
    }
    const [toColumn, actorName] = await Promise.all([
      this.prisma.boardColumn.findUnique({ where: { id: payload.toColumnId } }),
      this.getActorName(payload.actorId),
    ]);
    await this.createNotification({
      recipientId: task.assigneeId,
      type: NotificationType.STATUS_CHANGED,
      taskId: payload.taskId,
      message: `${actorName} đã chuyển task "${task.title}" sang ${toColumn?.name ?? 'trạng thái khác'}`,
    });
  }

  @OnEvent(COMMENT_EVENTS.CREATED)
  async handleCommentCreated(payload: CommentCreatedEvent) {
    await this.notifyMentions(payload.taskId, payload.commentId, payload.authorId, payload.mentionedUserIds);
  }

  @OnEvent(COMMENT_EVENTS.MENTIONED)
  async handleCommentMentioned(payload: CommentMentionedEvent) {
    await this.notifyMentions(payload.taskId, payload.commentId, payload.authorId, payload.mentionedUserIds);
  }

  private async notifyMentions(
    taskId: string,
    commentId: string,
    authorId: string,
    mentionedUserIds: string[],
  ) {
    const targets = mentionedUserIds.filter((id) => id !== authorId);
    if (targets.length === 0) {
      return;
    }
    const [task, actorName] = await Promise.all([
      this.prisma.task.findUnique({ where: { id: taskId } }),
      this.getActorName(authorId),
    ]);
    if (!task) {
      return;
    }
    for (const recipientId of targets) {
      await this.createNotification({
        recipientId,
        type: NotificationType.MENTIONED,
        taskId,
        commentId,
        message: `${actorName} đã nhắc đến bạn trong task "${task.title}"`,
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDueSoonTasks() {
    const threshold = new Date(Date.now() + DUE_SOON_WINDOW_MS);
    const candidates = await this.prisma.task.findMany({
      where: { dueDate: { lte: threshold }, completedAt: null, assigneeId: { not: null } },
    });

    for (const task of candidates) {
      const alreadyNotified = await this.prisma.notification.findFirst({
        where: { taskId: task.id, type: NotificationType.DUE_SOON },
      });
      if (alreadyNotified) {
        continue;
      }
      await this.createNotification({
        recipientId: task.assigneeId as string,
        type: NotificationType.DUE_SOON,
        taskId: task.id,
        message: `Task "${task.title}" sắp đến hạn (${task.dueDate?.toISOString().slice(0, 10)})`,
      });
    }
  }

  private async getActorName(actorId: string | null): Promise<string> {
    if (!actorId) {
      return 'Hệ thống';
    }
    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    return user?.name ?? 'Ai đó';
  }
}
