import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TaskAttachmentsController } from './task-attachments.controller';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { StorageService } from './storage/storage.service';
import { LocalStorageService } from './storage/local-storage.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: memoryStorage(),
        limits: { fileSize: config.getOrThrow<number>('MAX_UPLOAD_SIZE_MB') * 1024 * 1024 },
      }),
    }),
  ],
  controllers: [TaskAttachmentsController, AttachmentsController],
  providers: [AttachmentsService, { provide: StorageService, useClass: LocalStorageService }],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
