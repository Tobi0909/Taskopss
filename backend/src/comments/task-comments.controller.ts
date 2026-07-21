import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { BoardRoles } from '../common/decorators/board-roles.decorator';
import { fromTaskParam } from '../common/board-id-resolvers';

@Controller('tasks/:taskId/comments')
export class TaskCommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @BoardRoles(BoardRole.VIEWER, fromTaskParam('taskId'))
  @Get()
  findAll(@Param('taskId') taskId: string) {
    return this.commentsService.findAllForTask(taskId);
  }

  @BoardRoles(BoardRole.MEMBER, fromTaskParam('taskId'))
  @Post()
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commentsService.create(taskId, dto, user.id);
  }
}
