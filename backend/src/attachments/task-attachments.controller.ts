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
import { BoardRole } from '@prisma/client';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { MulterExceptionFilter } from './filters/multer-exception.filter';
import { BoardRoles } from '../common/decorators/board-roles.decorator';
import { fromTaskParam } from '../common/board-id-resolvers';

@Controller('tasks/:taskId/attachments')
export class TaskAttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @BoardRoles(BoardRole.VIEWER, fromTaskParam('taskId'))
  @Get()
  findAll(@Param('taskId') taskId: string) {
    return this.attachmentsService.findAllForTask(taskId);
  }

  @BoardRoles(BoardRole.MEMBER, fromTaskParam('taskId'))
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
