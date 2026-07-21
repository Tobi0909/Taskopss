import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { BoardRole } from '@prisma/client';
import { ChecklistService } from './checklist.service';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { ReorderChecklistItemDto } from './dto/reorder-checklist-item.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { BoardRoles } from '../common/decorators/board-roles.decorator';
import { fromChecklistItemParam } from '../common/board-id-resolvers';

@Controller('checklist-items')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @BoardRoles(BoardRole.MEMBER, fromChecklistItemParam('id'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistService.update(id, dto, user.id);
  }

  @BoardRoles(BoardRole.MEMBER, fromChecklistItemParam('id'))
  @Patch(':id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderChecklistItemDto) {
    return this.checklistService.reorder(id, dto);
  }

  @BoardRoles(BoardRole.MEMBER, fromChecklistItemParam('id'))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.checklistService.remove(id, user.id);
  }
}
