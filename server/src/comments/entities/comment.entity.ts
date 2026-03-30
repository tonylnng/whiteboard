import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'board_id' })
  boardId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  content: string;

  @Column({ name: 'position_x', type: 'float', nullable: true })
  positionX: number;

  @Column({ name: 'position_y', type: 'float', nullable: true })
  positionY: number;

  @Column({ name: 'element_id', nullable: true })
  elementId: string;

  @Column({ name: 'is_resolved', default: false })
  isResolved: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
