import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { BoardsService } from './boards.service';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { BoardRoles } from '../common/decorators/board-roles.decorator';
import { fromBoardColumnParam } from '../common/board-id-resolvers';

@Controller('columns')
export class BoardColumnsController {
  constructor(private readonly boardsService: BoardsService) {}

  @BoardRoles(BoardRole.ADMIN, fromBoardColumnParam('id'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBoardColumnDto) {
    return this.boardsService.updateColumn(id, dto);
  }

  @BoardRoles(BoardRole.ADMIN, fromBoardColumnParam('id'))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.boardsService.removeColumn(id);
  }
}
