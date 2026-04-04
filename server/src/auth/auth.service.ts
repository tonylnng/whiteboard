import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from '../boards/entities/board.entity';
import { BoardMember } from '../boards/entities/board-member.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectRepository(Board) private boardRepo: Repository<Board>,
    @InjectRepository(BoardMember) private memberRepo: Repository<BoardMember>,
  ) {}

  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({ ...dto, password: hashed });
    return this.generateTokens(user.id, user.email, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('帳號或密碼錯誤');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('帳號或密碼錯誤');
    return this.generateTokens(user.id, user.email, user.name);
  }

  async guestJoin(shareToken: string, guestName: string): Promise<{ accessToken: string; user: any; boardId: string }> {
    const board = await this.boardRepo.findOne({ where: { shareToken } });
    if (!board) throw new NotFoundException('無效的分享連結');

    // Use a plain UUID for guest (no prefix - compatible with UUID column)
    const guestId = uuidv4();

    // Add as board member
    const existing = await this.memberRepo.findOne({ where: { boardId: board.id, userId: guestId } });
    if (!existing) {
      await this.memberRepo.save({
        boardId: board.id,
        userId: guestId,
        role: board.sharePermission === 'editor' ? 'editor' : 'viewer',
      });
    }

    const guestRole = board.sharePermission === 'editor' ? 'editor' : 'viewer';
    // Include role in JWT so CollabGateway can enforce edit permissions
    const payload = { sub: guestId, name: guestName, isGuest: true, boardId: board.id, role: guestRole };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '24h' });

    return {
      accessToken,
      user: { id: guestId, name: guestName, isGuest: true, role: guestRole },
      boardId: board.id,
    };
  }

  generateTokens(userId: string, email: string, name: string) {
    const payload = { sub: userId, email, name };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
      }),
      user: { id: userId, email, name },
    };
  }
}
