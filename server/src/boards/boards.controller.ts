import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('folderId') folderId?: string, @Query('search') search?: string) {
    return this.boardsService.findAllByUser(user.sub, folderId, search);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateBoardDto) {
    return this.boardsService.create(user.sub, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.boardsService.findOne(id, user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateBoardDto) {
    return this.boardsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.boardsService.remove(id, user.sub);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.boardsService.duplicate(id, user.sub);
  }

  @Post(':id/share')
  share(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { permission?: string }) {
    return this.boardsService.generateShareLink(id, user.sub, body.permission || 'editor');
  }

  @Post('join/:token')
  joinByToken(@Param('token') token: string, @CurrentUser() user: any) {
    return this.boardsService.joinByShareToken(token, user.sub);
  }

  @Get(':id/snapshot')
  getSnapshot(@Param('id') id: string, @CurrentUser() user: any) {
    return this.boardsService.getSnapshot(id, user.sub);
  }

  @Post(':id/snapshot')
  saveSnapshot(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { snapshot?: any; excalidrawSnapshot?: any }) {
    if (body.excalidrawSnapshot !== undefined) {
      return this.boardsService.saveExcalidrawSnapshot(id, user.sub, body.excalidrawSnapshot);
    }
    return this.boardsService.saveSnapshot(id, user.sub, body.snapshot);
  }
}
