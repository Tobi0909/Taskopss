import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role } from '@prisma/client';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage/storage.service';

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let prisma: any;
  let storage: { save: jest.Mock; getAbsolutePath: jest.Mock; delete: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      task: { findUnique: jest.fn() },
      attachment: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
      activityLog: { create: jest.fn() },
      $transaction: jest.fn((arg: any) =>
        Array.isArray(arg) ? Promise.all(arg) : arg(prisma),
      ),
    };
    storage = {
      save: jest.fn().mockResolvedValue({ storedFilename: 'uuid.log', sizeBytes: 123 }),
      getAbsolutePath: jest.fn().mockReturnValue('/data/uploads/uuid.log'),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = { emit: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(AttachmentsService);
  });

  describe('upload', () => {
    it('ném NotFoundException nếu task không tồn tại', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(
        service.upload('task-1', { buffer: Buffer.from('x'), originalname: 'a.log', mimetype: 'text/plain' } as any, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('lưu file qua StorageService rồi ghi record + activity log', async () => {
      prisma.task.findUnique.mockResolvedValue({ id: 'task-1', boardId: 'board-1' });
      prisma.attachment.create.mockResolvedValue({
        id: 'att-1',
        originalFilename: 'a.log',
        mimeType: 'text/plain',
        sizeBytes: 123n,
        createdAt: new Date(),
        uploadedBy: { id: 'user-1', name: 'An', avatarColor: '#fff' },
      });

      const result = await service.upload(
        'task-1',
        { buffer: Buffer.from('x'), originalname: 'a.log', mimetype: 'text/plain' } as any,
        'user-1',
      );

      expect(storage.save).toHaveBeenCalledWith(Buffer.from('x'), 'a.log');
      expect(prisma.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'ATTACHMENT_ADDED' }) }),
      );
      expect(result.sizeBytes).toBe(123);
      expect(result.downloadUrl).toBe('/api/attachments/att-1/download');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.changed',
        expect.objectContaining({ taskId: 'task-1', boardId: 'board-1' }),
      );
    });
  });

  describe('remove', () => {
    it('ném ForbiddenException nếu không phải người tải lên và không phải ADMIN', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        uploadedById: 'user-1',
        taskId: 't1',
        task: { boardId: 'board-1' },
      });

      await expect(service.remove('att-1', 'user-2', Role.MEMBER)).rejects.toThrow(ForbiddenException);
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('xoá file trên disk sau khi xoá record trong DB thành công', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        uploadedById: 'user-1',
        taskId: 't1',
        storedFilename: 'uuid.log',
        originalFilename: 'a.log',
        task: { boardId: 'board-1' },
      });

      await service.remove('att-1', 'user-1', Role.MEMBER);

      expect(prisma.attachment.delete).toHaveBeenCalledWith({ where: { id: 'att-1' } });
      expect(storage.delete).toHaveBeenCalledWith('uuid.log');
    });
  });
});
