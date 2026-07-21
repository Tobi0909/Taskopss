import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { SetTaskTagsDto } from './dto/set-task-tags.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { BoardRoles } from '../common/decorators/board-roles.decorator';
import { fromBody, fromTaskParam } from '../common/board-id-resolvers';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: QueryTasksDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.findAll(query, user);
  }

  @BoardRoles(BoardRole.VIEWER, fromTaskParam('id'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @BoardRoles(BoardRole.VIEWER, fromTaskParam('id'))
  @Get(':id/activity')
  getActivityLog(@Param('id') id: string) {
    return this.tasksService.getActivityLog(id);
  }

  @BoardRoles(BoardRole.MEMBER, fromBody('boardId'))
  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.create(dto, user.id);
  }

  @BoardRoles(BoardRole.MEMBER, fromTaskParam('id'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.update(id, dto, user.id);
  }

  @BoardRoles(BoardRole.MEMBER, fromTaskParam('id'))
  @Patch(':id/move')
  move(@Param('id') id: string, @Body() dto: MoveTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.move(id, dto, user.id);
  }

  @BoardRoles(BoardRole.MEMBER, fromTaskParam('id'))
  @Put(':id/tags')
  setTags(@Param('id') id: string, @Body() dto: SetTaskTagsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.setTags(id, dto, user.id);
  }

  @BoardRoles(BoardRole.MEMBER, fromTaskParam('id'))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
