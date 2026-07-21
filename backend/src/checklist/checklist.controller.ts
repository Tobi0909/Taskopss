import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { ReorderChecklistItemDto } from './dto/reorder-checklist-item.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

@Controller('checklist-items')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChecklistItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checklistService.update(id, dto, user.id);
  }

  @Patch(':id/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderChecklistItemDto) {
    return this.checklistService.reorder(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.checklistService.remove(id, user.id);
  }
}
