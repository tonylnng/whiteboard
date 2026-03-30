import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Folder } from './entities/folder.entity';

@Injectable()
export class FoldersService {
  constructor(@InjectRepository(Folder) private repo: Repository<Folder>) {}

  findAll(ownerId: string) {
    return this.repo.find({ where: { ownerId }, order: { createdAt: 'ASC' } });
  }

  create(ownerId: string, data: { name: string; parentId?: string }) {
    const folder = this.repo.create({ ...data, ownerId });
    return this.repo.save(folder);
  }

  async update(id: string, ownerId: string, data: { name?: string }) {
    await this.repo.update({ id, ownerId }, data);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string, ownerId: string) {
    await this.repo.delete({ id, ownerId });
  }
}
