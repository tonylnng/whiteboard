import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { BoardsService } from './boards.service';

@Controller('share')
export class ShareController {
  constructor(private boardsService: BoardsService) {}

  @Get(':token')
  async findByToken(@Param('token') token: string) {
    const board = await this.boardsService.findByShareToken(token);
    if (!board) throw new NotFoundException('無效的分享連結');
    return { id: board.id, name: board.name, sharePermission: board.sharePermission };
  }
}
