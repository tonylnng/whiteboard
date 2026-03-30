import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BoardsService } from './boards.service';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class SnapshotController {
  constructor(private boardsService: BoardsService) {}

  @Get(':id/snapshot')
  async getSnapshot(@Param('id') id: string, @CurrentUser() user: any) {
    return this.boardsService.getSnapshot(id, user.sub);
  }

  @Post(':id/snapshot')
  async saveSnapshot(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { snapshot: any }) {
    return this.boardsService.saveSnapshot(id, user.sub, body.snapshot);
  }
}
