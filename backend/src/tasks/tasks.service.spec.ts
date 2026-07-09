import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { TASK_EVENTS } from './tasks.events';

describe('TasksService', () => {
  let tasksService: TasksService;
  let prisma: any;
  let eventEmitter: { emit: jest.Mock };

  const fullTaskRow = (overrides: Partial<any> = {}) => ({
    id: 'task-1',
    boardId: 'board-1',
    columnId: 'col-todo',
    sequenceNumber: 142,
    title: 'Node exporter down',
    description: '',
    priority: 'P3',
    assigneeId: null,
    dueDate: null,
    completedAt: null,
    position: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    board: { keyPrefix: 'INF' },
    column: { id: 'col-todo', name: 'To Do', isDoneColumn: false },
    assignee: null,
    createdBy: { id: 'user-1', name: 'An' },
    tags: [],
    _count: { comments: 0, attachments: 0 },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      task: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      boardColumn: { findUnique: jest.fn() },
      board: { update: jest.fn() },
      user: { findUnique: jest.fn() },
      tag: { findMany: jest.fn() },
      taskTag: { deleteMany: jest.fn(), createMany: jest.fn() },
      activityLog: { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    eventEmitter = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    tasksService = moduleRef.get(TasksService);
  });

  describe('findOne', () => {
    it('ghép key từ keyPrefix + sequenceNumber', async () => {
      prisma.task.findUnique.mockResolvedValue(fullTaskRow());

      const result = await tasksService.findOne('task-1');

      expect(result.key).toBe('INF-142');
    });

    it('ném NotFoundException nếu không tìm thấy task', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(tasksService.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('đặt position = 1 khi cột đang trống, tăng board counter trong transaction', async () => {
      prisma.boardColumn.findUnique.mockResolvedValue({ id: 'col-todo', boardId: 'board-1', isDoneColumn: false });
      prisma.task.findFirst.mockResolvedValue(null);
      prisma.board.update.mockResolvedValue({ id: 'board-1', taskCounter: 143 });
      prisma.task.create.mockResolvedValue({ id: 'task-2', assigneeId: null });
      prisma.activityLog.create.mockResolvedValue({});
      prisma.task.findUnique.mockResolvedValue(fullTaskRow({ id: 'task-2', sequenceNumber: 143 }));

      const result = await tasksService.create(
        { boardId: 'board-1', columnId: 'col-todo', title: 'Task mới' },
        'user-1',
      );

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 1, sequenceNumber: 143 }) }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(TASK_EVENTS.CREATED, { taskId: 'task-2', actorId: 'user-1' });
      expect(result.key).toBe('INF-143');
    });

    it('ném BadRequestException nếu cột không thuộc board đã chọn', async () => {
      prisma.boardColumn.findUnique.mockResolvedValue({ id: 'col-todo', boardId: 'other-board' });

      await expect(
        tasksService.create({ boardId: 'board-1', columnId: 'col-todo', title: 'X' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('move', () => {
    const currentTask = { id: 'task-1', boardId: 'board-1', columnId: 'col-todo', completedAt: null };

    beforeEach(() => {
      prisma.task.findUnique.mockImplementation((args: any) => {
        if (args.where.id === 'task-1' && !args.include) return Promise.resolve(currentTask);
        return Promise.resolve(fullTaskRow());
      });
    });

    it('đặt position = 1 khi thả vào cột trống, không afterTaskId', async () => {
      prisma.boardColumn.findUnique.mockResolvedValue({ id: 'col-doing', boardId: 'board-1', isDoneColumn: false });
      prisma.task.findMany.mockResolvedValue([]);

      await tasksService.move('task-1', { columnId: 'col-doing' }, 'user-1');

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 1 }) }),
      );
    });

    it('tính position là trung bình cộng giữa 2 task liền kề', async () => {
      prisma.boardColumn.findUnique.mockResolvedValue({ id: 'col-doing', boardId: 'board-1', isDoneColumn: false });
      prisma.task.findMany.mockResolvedValue([
        { id: 'sib-1', position: 2 },
        { id: 'sib-2', position: 4 },
      ]);

      await tasksService.move('task-1', { columnId: 'col-doing', afterTaskId: 'sib-1' }, 'user-1');

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 3 }) }),
      );
    });

    it('set completedAt khi chuyển sang cột isDoneColumn=true', async () => {
      prisma.boardColumn.findUnique.mockResolvedValue({ id: 'col-done', boardId: 'board-1', isDoneColumn: true });
      prisma.task.findMany.mockResolvedValue([]);

      await tasksService.move('task-1', { columnId: 'col-done' }, 'user-1');

      const updateCall = prisma.task.update.mock.calls[0][0];
      expect(updateCall.data.completedAt).toBeInstanceOf(Date);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        TASK_EVENTS.STATUS_CHANGED,
        expect.objectContaining({ fromColumnId: 'col-todo', toColumnId: 'col-done' }),
      );
    });

    it('không ghi activity log nếu chỉ reorder trong cùng 1 cột', async () => {
      prisma.boardColumn.findUnique.mockResolvedValue({ id: 'col-todo', boardId: 'board-1', isDoneColumn: false });
      prisma.task.findMany.mockResolvedValue([]);

      await tasksService.move('task-1', { columnId: 'col-todo' }, 'user-1');

      expect(prisma.activityLog.create).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(TASK_EVENTS.STATUS_CHANGED, expect.anything());
    });
  });

  describe('setTags', () => {
    it('chỉ thêm/xoá đúng phần chênh lệch, không đụng tag giữ nguyên', async () => {
      prisma.task.findUnique
        .mockResolvedValueOnce({
          id: 'task-1',
          tags: [{ tagId: 'tag-keep' }, { tagId: 'tag-remove' }],
        })
        .mockResolvedValueOnce(fullTaskRow());
      prisma.tag.findMany.mockResolvedValue([
        { id: 'tag-add', name: 'security' },
        { id: 'tag-remove', name: 'network' },
      ]);

      await tasksService.setTags('task-1', { tagIds: ['tag-keep', 'tag-add'] }, 'user-1');

      expect(prisma.taskTag.deleteMany).toHaveBeenCalledWith({
        where: { taskId: 'task-1', tagId: { in: ['tag-remove'] } },
      });
      expect(prisma.taskTag.createMany).toHaveBeenCalledWith({
        data: [{ taskId: 'task-1', tagId: 'tag-add' }],
      });
    });
  });
});
