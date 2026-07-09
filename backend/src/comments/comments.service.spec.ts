import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '@prisma/client';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';
import { COMMENT_EVENTS } from './comments.events';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

describe('CommentsService', () => {
  let commentsService: CommentsService;
  let prisma: any;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      task: { findUnique: jest.fn() },
      user: { findMany: jest.fn() },
      comment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      commentMention: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    eventEmitter = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    commentsService = moduleRef.get(CommentsService);
  });

  describe('create', () => {
    it('ném NotFoundException nếu task không tồn tại', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(commentsService.create('task-1', { body: 'hello' }, USER_A)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('chỉ giữ lại mention hợp lệ (user tồn tại và active), tạo CommentMention tương ứng', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', boardId: 'board-1' });
      prisma.user.findMany.mockResolvedValue([{ id: USER_A }]);
      prisma.comment.create.mockResolvedValue({ id: 'comment-1', taskId: 'task-1', authorId: USER_A });

      const body = `@[An](${USER_A}) @[Bình đã nghỉ](${USER_B})`;
      await commentsService.create('task-1', { body }, USER_A);

      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mentions: { create: [{ mentionedUserId: USER_A }] },
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMENT_EVENTS.CREATED,
        expect.objectContaining({ mentionedUserIds: [USER_A] }),
      );
    });
  });

  describe('update', () => {
    it('ném ForbiddenException nếu không phải tác giả', async () => {
      prisma.comment.findUnique.mockResolvedValue({ id: 'c1', authorId: USER_A, mentions: [] });

      await expect(commentsService.update('c1', { body: 'edit' }, USER_B)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('chỉ emit MENTIONED cho user mới được thêm, không lặp lại user đã mention từ trước', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'c1',
        taskId: 'task-1',
        authorId: USER_A,
        mentions: [{ mentionedUserId: USER_A }],
        task: { boardId: 'board-1' },
      });
      prisma.user.findMany.mockResolvedValue([{ id: USER_A }, { id: USER_B }]);
      prisma.comment.update.mockResolvedValue({ id: 'c1' });

      await commentsService.update('c1', { body: `@[A](${USER_A}) @[B](${USER_B})` }, USER_A);

      expect(prisma.commentMention.createMany).toHaveBeenCalledWith({
        data: [{ commentId: 'c1', mentionedUserId: USER_B }],
      });
      expect(prisma.commentMention.deleteMany).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMENT_EVENTS.MENTIONED,
        expect.objectContaining({ mentionedUserIds: [USER_B] }),
      );
    });
  });

  describe('remove', () => {
    it('ném ForbiddenException nếu không phải tác giả và không phải ADMIN', async () => {
      prisma.comment.findUnique.mockResolvedValue({ id: 'c1', authorId: USER_A, task: { boardId: 'board-1' } });

      await expect(commentsService.remove('c1', USER_B, Role.MEMBER)).rejects.toThrow(ForbiddenException);
    });

    it('cho phép ADMIN xoá bình luận của người khác', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'c1',
        authorId: USER_A,
        taskId: 'task-1',
        task: { boardId: 'board-1' },
      });
      prisma.comment.delete.mockResolvedValue({});

      await expect(commentsService.remove('c1', USER_B, Role.ADMIN)).resolves.toBeUndefined();
      expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });
});
