import { Module } from '@nestjs/common';
import { TaskChecklistController } from './task-checklist.controller';
import { ChecklistController } from './checklist.controller';
import { ChecklistService } from './checklist.service';

@Module({
  controllers: [TaskChecklistController, ChecklistController],
  providers: [ChecklistService],
  exports: [ChecklistService],
})
export class ChecklistModule {}
