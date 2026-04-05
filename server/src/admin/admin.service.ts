import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Board } from '../boards/entities/board.entity';
import { BoardMember } from '../boards/entities/board-member.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Board) private boardRepo: Repository<Board>,
    @InjectRepository(BoardMember) private memberRepo: Repository<BoardMember>,
    private usersService: UsersService,
  ) {}

  async getUsers() {
    const users = await this.usersService.findAll();
    // For each user, count boards owned
    const boardCounts = await this.boardRepo
      .createQueryBuilder('b')
      .select('b.owner_id', 'ownerId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('b.owner_id')
      .getRawMany();

    const countMap: Record<string, number> = {};
    for (const row of boardCounts) countMap[row.ownerId] = parseInt(row.count, 10);

    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      boardCount: countMap[u.id] || 0,
    }));
  }

  async updateUser(id: string, data: { name?: string; isAdmin?: boolean }) {
    return this.usersService.updateUser(id, data);
  }

  async deleteUser(id: string) {
    return this.usersService.deleteUser(id);
  }

  async getStats() {
    const [totalUsers, totalBoards, publicBoards, sharedBoards] = await Promise.all([
      this.userRepo.count(),
      this.boardRepo.count(),
      this.boardRepo.count({ where: { isPublic: true } }),
      this.boardRepo.createQueryBuilder('b').where('b.share_token IS NOT NULL').getCount(),
    ]);

    // Boards created per day (last 30 days)
    const boardsPerDay = await this.boardRepo
      .createQueryBuilder('b')
      .select("DATE(b.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where("b.created_at >= NOW() - INTERVAL '30 days'")
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Users registered per day (last 30 days)
    const usersPerDay = await this.userRepo
      .createQueryBuilder('u')
      .select("DATE(u.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where("u.created_at >= NOW() - INTERVAL '30 days'")
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Board type breakdown
    const boardTypes = await this.boardRepo
      .createQueryBuilder('b')
      .select('b.board_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('b.board_type')
      .getRawMany();

    // Top users by board count
    const topUsers = await this.boardRepo
      .createQueryBuilder('b')
      .select('b.owner_id', 'ownerId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('b.owner_id')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Join with user names
    const userIds = topUsers.map(r => r.ownerId);
    let topUserDetails: any[] = [];
    if (userIds.length > 0) {
      const users = await this.userRepo
        .createQueryBuilder('u')
        .where('u.id IN (:...ids)', { ids: userIds })
        .getMany();
      const userMap: Record<string, User> = {};
      for (const u of users) userMap[u.id] = u;
      topUserDetails = topUsers.map(r => ({
        userId: r.ownerId,
        name: userMap[r.ownerId]?.name || 'Unknown',
        email: userMap[r.ownerId]?.email || '',
        boardCount: parseInt(r.count, 10),
      }));
    }

    // Collaboration stats — boards with >1 member
    const collabBoards = await this.memberRepo
      .createQueryBuilder('m')
      .select('m.board_id', 'boardId')
      .addSelect('COUNT(*)', 'memberCount')
      .groupBy('m.board_id')
      .having('COUNT(*) > 1')
      .getCount();

    return {
      overview: { totalUsers, totalBoards, publicBoards, sharedBoards, collabBoards },
      boardsPerDay: boardsPerDay.map(r => ({ date: r.date, count: parseInt(r.count, 10) })),
      usersPerDay: usersPerDay.map(r => ({ date: r.date, count: parseInt(r.count, 10) })),
      boardTypes: boardTypes.map(r => ({ type: r.type || 'unknown', count: parseInt(r.count, 10) })),
      topUsers: topUserDetails,
    };
  }
}
