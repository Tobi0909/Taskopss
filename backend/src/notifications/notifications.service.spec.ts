import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const USER_A = 'user-a';
const USER_B = 'user-b';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
      },
      task: { findUnique: jest.fn(), findMany: jest.fn() },
      boardColumn: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    eventEmitter = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  describe('markRead', () => {
    it('ném NotFoundException nếu không tìm thấy thông báo', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.markRead('n1', USER_A)).rejects.toThrow(NotFoundException);
    });

    it('ném ForbiddenException nếu thông báo không thuộc về user', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', recipientId: USER_A });
      await expect(service.markRead('n1', USER_B)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('handleTaskAssigned', () => {
    it('bỏ qua nếu tự gán cho chính mình', async () => {
      await service.handleTaskAssigned({ taskId: 't1', assigneeId: USER_A, actorId: USER_A });
      expect(prisma.task.findUnique).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('tạo notification khi người khác gán task', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        title: 'Fix node exporter',
        sequenceNumber: 5,
        board: { keyPrefix: 'INF' },
      });
      prisma.user.findUnique.mockResolvedValue({ id: USER_B, name: 'Bình' });

      await service.handleTaskAssigned({ taskId: 't1', assigneeId: USER_A, actorId: USER_B });

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: USER_A,
            type: 'ASSIGNED',
            message: expect.stringContaining('Bình'),
          }),
        }),
      );
    });
  });

  describe('handleTaskStatusChanged', () => {
    it('bỏ qua nếu task chưa có assignee', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1', assigneeId: null });

      await service.handleTaskStatusChanged({
        taskId: 't1',
        fromColumnId: 'c1',
        toColumnId: 'c2',
        actorId: USER_B,
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('bỏ qua nếu chính assignee là người đổi trạng thái', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1', assigneeId: USER_A });

      await service.handleTaskStatusChanged({
        taskId: 't1',
        fromColumnId: 'c1',
        toColumnId: 'c2',
        actorId: USER_A,
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('notifyMentions (qua handleCommentCreated)', () => {
    it('không tự thông báo cho chính tác giả nếu tự mention mình', async () => {
      await service.handleCommentCreated({
        commentId: 'c1',
        taskId: 't1',
        authorId: USER_A,
        mentionedUserIds: [USER_A],
      });
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('tạo notification cho người được mention (trừ tác giả) và emit realtime event', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 't1', title: 'Fix node exporter' });
      prisma.user.findUnique.mockResolvedValue({ id: USER_A, name: 'An' });
      prisma.notification.create.mockResolvedValue({ id: 'n1', recipientId: USER_B });

      await service.handleCommentCreated({
        commentId: 'c1',
        taskId: 't1',
        authorId: USER_A,
        mentionedUserIds: [USER_A, USER_B],
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ recipientId: USER_B, type: 'MENTIONED', commentId: 'c1' }),
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', { id: 'n1', recipientId: USER_B });
    });
  });

  describe('checkDueSoonTasks', () => {
    it('không tạo trùng notification DUE_SOON nếu task đã được cảnh báo trước đó', async () => {
      prisma.task.findMany.mockResolvedValue([{ id: 't1', title: 'X', dueDate: new Date(), assigneeId: USER_A }]);
      prisma.notification.findFirst.mockResolvedValue({ id: 'existing' });

      await service.checkDueSoonTasks();

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('tạo notification DUE_SOON cho task chưa từng được cảnh báo', async () => {
      prisma.task.findMany.mockResolvedValue([
        { id: 't1', title: 'Renew SSH key', dueDate: new Date(), assigneeId: USER_A },
      ]);
      prisma.notification.findFirst.mockResolvedValue(null);

      await service.checkDueSoonTasks();

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recipientId: USER_A, type: 'DUE_SOON', taskId: 't1' }),
        }),
      );
    });
  });
});
