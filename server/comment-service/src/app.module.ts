import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { Comment } from './comments/entities/comment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST', 'db'),
        port: parseInt(config.get<string>('POSTGRES_PORT', '5432'), 10),
        username: config.get<string>('POSTGRES_USER', 'todo'),
        password: config.get<string>('POSTGRES_PASSWORD', 'todo'),
        database: config.get<string>('POSTGRES_DB', 'comments'),
        entities: [Comment],
        synchronize: config.get<string>('COMMENT_SCHEMA_SYNC', 'true') === 'true',
      }),
    }),
    AuthModule,
    CommentsModule,
  ],
})
export class AppModule {}
