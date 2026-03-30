import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FoldersService } from './folders.service';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  constructor(private foldersService: FoldersService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.foldersService.findAll(user.sub);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() body: { name: string; parentId?: string }) {
    return this.foldersService.create(user.sub, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { name?: string }) {
    return this.foldersService.update(id, user.sub, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.foldersService.remove(id, user.sub);
  }
}
