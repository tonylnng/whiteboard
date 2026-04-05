import { Module } from '@nestjs/common';
import { CollabGateway } from './collab.gateway';
import { BoardsModule } from '../boards/boards.module';

@Module({
  imports: [BoardsModule],
  providers: [CollabGateway],
})
export class CollabModule {}
