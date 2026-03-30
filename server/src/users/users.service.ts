import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async create(data: { email: string; name: string; password: string }): Promise<User> {
    const existing = await this.repo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('此 Email 已被使用');
    const user = this.repo.create({ email: data.email, name: data.name, passwordHash: data.password });
    return this.repo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateProfile(id: string, data: { name?: string; avatarUrl?: string }): Promise<User> {
    await this.repo.update(id, data);
    return this.findById(id);
  }
}
