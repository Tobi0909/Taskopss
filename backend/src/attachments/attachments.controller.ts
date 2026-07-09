import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const info = await this.attachmentsService.getDownloadInfo(id);
    res.download(info.absolutePath, info.originalFilename, (err) => {
      if (err && !res.headersSent) {
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy file trên server',
        });
      }
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.remove(id, user.id, user.role);
  }
}
