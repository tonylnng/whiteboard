import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { BoardMember } from './entities/board-member.entity';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { ShareController } from './share.controller';
import { SnapshotController } from './snapshot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Board, BoardMember])],
  providers: [BoardsService],
  controllers: [BoardsController, ShareController, SnapshotController],
  exports: [BoardsService],
})
export class BoardsModule {}
