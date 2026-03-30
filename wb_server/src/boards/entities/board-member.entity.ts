import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Board } from './board.entity';
import { User } from '../../users/entities/user.entity';

@Entity('board_members')
export class BoardMember {
  @PrimaryColumn({ name: 'board_id' })
  boardId: string;

  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @Column({ default: 'viewer' })
  role: string;

  @ManyToOne(() => Board, b => b.members)
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'invited_at' })
  invitedAt: Date;
}
