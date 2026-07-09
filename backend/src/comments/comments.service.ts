import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { extractMentionedUserIds } from './utils/mentions';
import { COMMENT_EVENTS, CommentCreatedEvent, CommentMentionedEvent } from './comments.events';
import { TASK_EVENTS, TaskChangedEvent } from '../tasks/tasks.events';

const authorSelect = { select: { id: true, name: true, avatarColor: true } } as const;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllForTask(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }
    return this.prisma.comment.findMany({
      where: { taskId },
      include: { author: authorSelect },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async resolveValidMentionIds(body: string): Promise<string[]> {
    const mentionedIds = extractMentionedUserIds(body);
    if (mentionedIds.length === 0) {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: mentionedIds }, isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async create(taskId: string, dto: CreateCommentDto, authorId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }

    const validMentionIds = await this.resolveValidMentionIds(dto.body);

    const comment = await this.prisma.comment.create({
      data: {
        taskId,
        authorId,
        body: dto.body,
        mentions:
          validMentionIds.length > 0
            ? { create: validMentionIds.map((mentionedUserId) => ({ mentionedUserId })) }
            : undefined,
      },
      include: { author: authorSelect },
    });

    this.eventEmitter.emit(COMMENT_EVENTS.CREATED, {
      commentId: comment.id,
      taskId,
      authorId,
      mentionedUserIds: validMentionIds,
    } satisfies CommentCreatedEvent);
    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId,
      boardId: task.boardId,
    } satisfies TaskChangedEvent);

    return comment;
  }

  async update(id: string, dto: UpdateCommentDto, actorId: string) {
    const existing = await this.prisma.comment.findUnique({
      where: { id },
      include: { mentions: true, task: { select: { boardId: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }
    if (existing.authorId !== actorId) {
      throw new ForbiddenException('Bạn chỉ có thể sửa bình luận của chính mình');
    }

    const validMentionIds = await this.resolveValidMentionIds(dto.body);
    const currentMentionIds = new Set(existing.mentions.map((m) => m.mentionedUserId));
    const newMentionIds = new Set(validMentionIds);
    const toAdd = validMentionIds.filter((uid) => !currentMentionIds.has(uid));
    const toRemove = [...currentMentionIds].filter((uid) => !newMentionIds.has(uid));

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.comment.update({
        where: { id },
        data: { body: dto.body, isEdited: true },
        include: { author: authorSelect },
      });
      if (toRemove.length > 0) {
        await tx.commentMention.deleteMany({
          where: { commentId: id, mentionedUserId: { in: toRemove } },
        });
      }
      if (toAdd.length > 0) {
        await tx.commentMention.createMany({
          data: toAdd.map((mentionedUserId) => ({ commentId: id, mentionedUserId })),
        });
      }
      return result;
    });

    if (toAdd.length > 0) {
      this.eventEmitter.emit(COMMENT_EVENTS.MENTIONED, {
        commentId: id,
        taskId: existing.taskId,
        authorId: actorId,
        mentionedUserIds: toAdd,
      } satisfies CommentMentionedEvent);
    }
    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: existing.taskId,
      boardId: existing.task.boardId,
    } satisfies TaskChangedEvent);

    return updated;
  }

  async remove(id: string, actorId: string, actorRole: Role) {
    const existing = await this.prisma.comment.findUnique({
      where: { id },
      include: { task: { select: { boardId: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }
    if (existing.authorId !== actorId && actorRole !== Role.ADMIN) {
      throw new ForbiddenException('Bạn chỉ có thể xoá bình luận của chính mình');
    }
    await this.prisma.comment.delete({ where: { id } });
    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: existing.taskId,
      boardId: existing.task.boardId,
    } satisfies TaskChangedEvent);
  }
}
