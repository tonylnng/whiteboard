import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CommentsService } from './comments.service';

@Controller('boards/:boardId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get()
  findAll(@Param('boardId') boardId: string) {
    return this.commentsService.findByBoard(boardId);
  }

  @Post()
  create(@Param('boardId') boardId: string, @CurrentUser() user: any, @Body() body: any) {
    return this.commentsService.create(boardId, user.sub, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.commentsService.update(id, user.sub, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.commentsService.remove(id, user.sub);
  }
}
