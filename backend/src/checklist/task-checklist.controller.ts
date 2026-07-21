import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { ChecklistService } from './checklist.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { BoardRoles } from '../common/decorators/board-roles.decorator';
import { fromTaskParam } from '../common/board-id-resolvers';

@Controller('tasks/:taskId/checklist-items')
export class TaskChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @BoardRoles(BoardRole.VIEWER, fromTaskParam('taskId'))
  @Get()
  findAll(@Param('taskId') taskId: string) {
    return this.checklistService.findAllForTask(taskId);
  }

  @BoardRoles(BoardRole.MEMBER, fromTaskParam('taskId'))
  @Post()
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistService.create(taskId, dto, user.id);
  }
}
