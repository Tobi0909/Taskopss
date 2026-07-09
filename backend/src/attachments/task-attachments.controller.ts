import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { MulterExceptionFilter } from './filters/multer-exception.filter';

@Controller('tasks/:taskId/attachments')
export class TaskAttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  findAll(@Param('taskId') taskId: string) {
    return this.attachmentsService.findAllForTask(taskId);
  }

  @Post()
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file để tải lên');
    }
    return this.attachmentsService.upload(taskId, file, user.id);
  }
}
