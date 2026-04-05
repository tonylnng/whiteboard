import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { BoardMember } from './entities/board-member.entity';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board) private boardRepo: Repository<Board>,
    @InjectRepository(BoardMember) private memberRepo: Repository<BoardMember>,
  ) {}

  async create(userId: string, dto: CreateBoardDto): Promise<Board> {
    const board = this.boardRepo.create({ ...dto, ownerId: userId });
    const saved = await this.boardRepo.save(board);
    await this.memberRepo.save({ boardId: saved.id, userId, role: 'owner' });
    return saved;
  }

  async findAllByUser(userId: string, folderId?: string, search?: string): Promise<Board[]> {
    const qb = this.boardRepo
      .createQueryBuilder('board')
      .innerJoin('board.members', 'member', 'member.userId = :userId', { userId })
      .leftJoinAndSelect('board.members', 'allMembers')
      .orderBy('board.updatedAt', 'DESC');
    if (folderId) qb.andWhere('board.folderId = :folderId', { folderId });
    if (search) qb.andWhere('board.name ILIKE :search', { search: `%${search}%` });
    return qb.getMany();
  }

  /** Internal use only — no auth check. Returns null if not found. */
  async findOneRaw(boardId: string): Promise<Board | null> {
    return this.boardRepo.findOne({ where: { id: boardId } });
  }

  async findOne(boardId: string, userId: string): Promise<Board> {
    const board = await this.boardRepo.findOne({
      where: { id: boardId },
      relations: ['members', 'members.user'],
    });
    if (!board) throw new NotFoundException('白板不存在');
    const isMember = board.members.some(m => m.userId === userId);
    if (!board.isPublic && !isMember) throw new ForbiddenException('無權限存取此白板');
    return board;
  }

  async update(boardId: string, userId: string, dto: UpdateBoardDto): Promise<Board> {
    const board = await this.findOne(boardId, userId);
    Object.assign(board, dto);
    return this.boardRepo.save(board);
  }

  async remove(boardId: string, userId: string): Promise<void> {
    const board = await this.findOne(boardId, userId);
    if (board.ownerId !== userId) throw new ForbiddenException('只有擁有者可以刪除白板');
    await this.boardRepo.remove(board);
  }

  async duplicate(boardId: string, userId: string): Promise<Board> {
    const original = await this.findOne(boardId, userId);
    const snapResult = await this.boardRepo.query(
      'SELECT tldraw_snapshot FROM boards WHERE id = $1', [boardId]
    );
    const snapshot = snapResult[0]?.tldraw_snapshot || null;
    const copy = this.boardRepo.create({
      name: `${original.name} (副本)`,
      ownerId: userId,
      folderId: original.folderId,
    });
    const saved = await this.boardRepo.save(copy);
    await this.memberRepo.save({ boardId: saved.id, userId, role: 'owner' });
    if (snapshot) {
      await this.boardRepo.query(
        'UPDATE boards SET tldraw_snapshot = $1 WHERE id = $2',
        [JSON.stringify(snapshot), saved.id]
      );
    }
    return saved;
  }

  async generateShareLink(boardId: string, userId: string, permission: string = 'editor') {
    const board = await this.findOne(boardId, userId);
    board.shareToken = randomBytes(32).toString('hex');
    board.sharePermission = permission;
    await this.boardRepo.save(board);
    return { shareUrl: `${process.env.APP_URL}/board/join/${board.shareToken}` };
  }

  async findByShareToken(token: string): Promise<Board | null> {
    return this.boardRepo.findOne({ where: { shareToken: token } });
  }

  async joinByShareToken(token: string, userId: string): Promise<{ id: string; name: string }> {
    const board = await this.boardRepo.findOne({ where: { shareToken: token } });
    if (!board) throw new NotFoundException('無效的分享連結');
    const existing = await this.memberRepo.findOne({ where: { boardId: board.id, userId } });
    if (!existing) {
      await this.memberRepo.save({
        boardId: board.id,
        userId,
        role: board.sharePermission === 'editor' ? 'editor' : 'viewer',
      });
    }
    return { id: board.id, name: board.name };
  }

  async addMember(boardId: string, ownerId: string, targetEmail: string, role: string) {
    return { boardId, targetEmail, role };
  }

  async getSnapshot(boardId: string, userId: string): Promise<{ snapshot: any; excalidrawSnapshot?: any }> {
    await this.findOne(boardId, userId);
    const result = await this.boardRepo.query(
      'SELECT tldraw_snapshot, excalidraw_snapshot FROM boards WHERE id = $1', [boardId]
    );
    return {
      snapshot: result[0]?.tldraw_snapshot || null,
      excalidrawSnapshot: result[0]?.excalidraw_snapshot || null,
    };
  }

  async saveSnapshot(boardId: string, userId: string, snapshot: any): Promise<{ ok: boolean }> {
    await this.findOne(boardId, userId);
    await this.boardRepo.query(
      'UPDATE boards SET tldraw_snapshot = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(snapshot), boardId]
    );
    return { ok: true };
  }

  async saveExcalidrawSnapshot(boardId: string, userId: string, excalidrawSnapshot: any): Promise<{ ok: boolean }> {
    await this.findOne(boardId, userId);
    await this.boardRepo.query(
      'UPDATE boards SET excalidraw_snapshot = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(excalidrawSnapshot), boardId]
    );
    return { ok: true };
  }
}
