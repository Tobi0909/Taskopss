import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

@Controller('tasks/:taskId/checklist-items')
export class TaskChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Get()
  findAll(@Param('taskId') taskId: string) {
    return this.checklistService.findAllForTask(taskId);
  }

  @Post()
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistService.create(taskId, dto, user.id);
  }
}
