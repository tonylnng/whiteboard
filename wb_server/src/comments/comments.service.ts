import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(@InjectRepository(Comment) private repo: Repository<Comment>) {}

  findByBoard(boardId: string) {
    return this.repo.find({ where: { boardId }, order: { createdAt: 'ASC' } });
  }

  create(boardId: string, userId: string, data: any) {
    const comment = this.repo.create({ ...data, boardId, userId });
    return this.repo.save(comment);
  }

  async update(id: string, userId: string, data: any) {
    await this.repo.update({ id, userId }, data);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string, userId: string) {
    await this.repo.delete({ id, userId });
  }
}
