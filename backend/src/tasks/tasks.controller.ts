import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { SetTaskTagsDto } from './dto/set-task-tags.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Query() query: QueryTasksDto) {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Get(':id/activity')
  getActivityLog(@Param('id') id: string) {
    return this.tasksService.getActivityLog(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.update(id, dto, user.id);
  }

  @Patch(':id/move')
  move(@Param('id') id: string, @Body() dto: MoveTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.move(id, dto, user.id);
  }

  @Put(':id/tags')
  setTags(@Param('id') id: string, @Body() dto: SetTaskTagsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.setTags(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
