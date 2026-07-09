import { Module } from '@nestjs/common';
import { BoardsController } from './boards.controller';
import { BoardColumnsController } from './board-columns.controller';
import { BoardsService } from './boards.service';

@Module({
  controllers: [BoardsController, BoardColumnsController],
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
