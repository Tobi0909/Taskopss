import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { BoardsService } from './boards.service';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('columns')
export class BoardColumnsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBoardColumnDto) {
    return this.boardsService.updateColumn(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.boardsService.removeColumn(id);
  }
}
