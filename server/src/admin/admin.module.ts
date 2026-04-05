import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';
import { Board } from '../boards/entities/board.entity';
import { BoardMember } from '../boards/entities/board-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Board, BoardMember]),
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
