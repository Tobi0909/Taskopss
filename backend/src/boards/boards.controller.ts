import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { BoardsService } from './boards.service';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { CreateBoardDto } from './dto/create-board.dto';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { UpdateBoardMemberDto } from './dto/update-board-member.dto';
import { BoardRoles } from '../common/decorators/board-roles.decorator';
import { fromBoardParam } from '../common/board-id-resolvers';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

@Controller('boards')
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.boardsService.findAll(user.id, user.role);
  }

  @Post()
  create(@Body() dto: CreateBoardDto, @CurrentUser() user: AuthenticatedUser) {
    return this.boardsService.create(dto, user.id);
  }

  @BoardRoles(BoardRole.VIEWER, fromBoardParam('id'))
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boardsService.findOneWithColumns(id);
  }

  @BoardRoles(BoardRole.OWNER, fromBoardParam('id'))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.boardsService.remove(id, user.id);
  }

  @BoardRoles(BoardRole.ADMIN, fromBoardParam('id'))
  @Post(':id/columns')
  createColumn(@Param('id') boardId: string, @Body() dto: CreateBoardColumnDto) {
    return this.boardsService.createColumn(boardId, dto);
  }

  @BoardRoles(BoardRole.VIEWER, fromBoardParam('id'))
  @Get(':id/members')
  listMembers(@Param('id') boardId: string) {
    return this.boardsService.listMembers(boardId);
  }

  @BoardRoles(BoardRole.ADMIN, fromBoardParam('id'))
  @Post(':id/members')
  addMember(
    @Param('id') boardId: string,
    @Body() dto: AddBoardMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.boardsService.addMember(boardId, dto, user.id);
  }

  @BoardRoles(BoardRole.ADMIN, fromBoardParam('id'))
  @Patch(':id/members/:userId')
  updateMemberRole(
    @Param('id') boardId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateBoardMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.boardsService.updateMemberRole(boardId, userId, dto, user.id);
  }

  @BoardRoles(BoardRole.ADMIN, fromBoardParam('id'))
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') boardId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.boardsService.removeMember(boardId, userId, user.id);
  }
}
