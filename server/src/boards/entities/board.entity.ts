import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { BoardMember } from './board-member.entity';

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '未命名白板' })
  name: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'folder_id', nullable: true })
  folderId: string;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'is_starred', default: false })
  isStarred: boolean;

  @Column({ name: 'share_token', nullable: true })
  shareToken: string;

  @Column({ name: 'share_permission', default: 'viewer' })
  sharePermission: string;

  @Column({ name: 'tldraw_snapshot', type: 'jsonb', nullable: true })
  tldrawSnapshot: any;

  @Column({ name: 'board_type', default: 'tldraw' })
  boardType: string;

  @Column({ name: 'excalidraw_snapshot', type: 'jsonb', nullable: true })
  excalidrawSnapshot: any;

  @OneToMany(() => BoardMember, m => m.board)
  members: BoardMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
