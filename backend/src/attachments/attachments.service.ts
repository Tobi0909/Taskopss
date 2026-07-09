import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ActivityAction, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage/storage.service';
import { TASK_EVENTS, TaskChangedEvent } from '../tasks/tasks.events';

const uploaderSelect = { select: { id: true, name: true, avatarColor: true } } as const;

function mapAttachment(row: {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: bigint;
  createdAt: Date;
  uploadedBy: { id: string; name: string; avatarColor: string } | null;
}) {
  return {
    id: row.id,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes),
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
    downloadUrl: `/api/attachments/${row.id}/download`,
  };
}

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllForTask(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }
    const rows = await this.prisma.attachment.findMany({
      where: { taskId },
      include: { uploadedBy: uploaderSelect },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(mapAttachment);
  }

  async upload(taskId: string, file: Express.Multer.File, uploaderId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Không tìm thấy task');
    }

    const { storedFilename, sizeBytes } = await this.storage.save(file.buffer, file.originalname);

    const created = await this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({
        data: {
          taskId,
          uploadedById: uploaderId,
          originalFilename: file.originalname,
          storedFilename,
          mimeType: file.mimetype,
          sizeBytes,
        },
        include: { uploadedBy: uploaderSelect },
      });
      await tx.activityLog.create({
        data: {
          taskId,
          actorId: uploaderId,
          action: ActivityAction.ATTACHMENT_ADDED,
          metadata: { filename: file.originalname },
        },
      });
      return attachment;
    });

    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId,
      boardId: task.boardId,
    } satisfies TaskChangedEvent);

    return mapAttachment(created);
  }

  async getDownloadInfo(id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      throw new NotFoundException('Không tìm thấy file');
    }
    return {
      absolutePath: this.storage.getAbsolutePath(attachment.storedFilename),
      originalFilename: attachment.originalFilename,
    };
  }

  async remove(id: string, actorId: string, actorRole: Role) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      include: { task: { select: { boardId: true } } },
    });
    if (!attachment) {
      throw new NotFoundException('Không tìm thấy file');
    }
    if (attachment.uploadedById !== actorId && actorRole !== Role.ADMIN) {
      throw new ForbiddenException('Bạn chỉ có thể xoá file do chính mình tải lên');
    }

    await this.prisma.$transaction([
      this.prisma.activityLog.create({
        data: {
          taskId: attachment.taskId,
          actorId,
          action: ActivityAction.ATTACHMENT_REMOVED,
          metadata: { filename: attachment.originalFilename },
        },
      }),
      this.prisma.attachment.delete({ where: { id } }),
    ]);

    await this.storage.delete(attachment.storedFilename);

    this.eventEmitter.emit(TASK_EVENTS.CHANGED, {
      taskId: attachment.taskId,
      boardId: attachment.task.boardId,
    } satisfies TaskChangedEvent);
  }
}
