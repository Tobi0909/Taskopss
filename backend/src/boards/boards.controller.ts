import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BoardsService } from './boards.service';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  findAll() {
    return this.boardsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardsService.findOneWithColumns(id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/columns')
  createColumn(@Param('id') boardId: string, @Body() dto: CreateBoardColumnDto) {
    return this.boardsService.createColumn(boardId, dto);
  }
}
