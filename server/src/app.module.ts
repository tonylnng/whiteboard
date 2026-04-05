import { Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BoardsModule } from './boards/boards.module';
import { FoldersModule } from './folders/folders.module';
import { CommentsModule } from './comments/comments.module';
import { UploadModule } from './upload/upload.module';
import { AiModule } from './ai/ai.module';
import { CollabModule } from './collab/collab.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('POSTGRES_HOST'),
        port: config.get<number>('POSTGRES_PORT'),
        username: config.get('POSTGRES_USER'),
        password: config.get('POSTGRES_PASSWORD'),
        database: config.get('POSTGRES_DB'),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
    }),
    AuthModule,
    UsersModule,
    BoardsModule,
    FoldersModule,
    CommentsModule,
    UploadModule,
    AiModule,
    CollabModule,
    AdminModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onModuleInit() {
    // Add is_admin column if it doesn't exist (safe migration)
    await this.dataSource.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false
    `);

    // Promote ADMIN_EMAIL to admin on startup
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await this.dataSource.query(
        `UPDATE users SET is_admin = true WHERE email = $1`,
        [adminEmail]
      );
    }
  }
}
