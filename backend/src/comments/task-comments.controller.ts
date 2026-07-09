import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

@Controller('tasks/:taskId/comments')
export class TaskCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  findAll(@Param('taskId') taskId: string) {
    return this.commentsService.findAllForTask(taskId);
  }

  @Post()
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.create(taskId, dto, user.id);
  }
}
