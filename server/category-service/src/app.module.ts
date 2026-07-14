import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { Category, CategoryInvitation, CategoryMember } from './categories/entities/category.entity';
import { CategoriesModule } from './categories/categories.module';

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
        database: config.get<string>('POSTGRES_DB', 'categories'),
        entities: [Category, CategoryMember, CategoryInvitation],
        synchronize: config.get<string>('CATEGORY_SCHEMA_SYNC', config.get<string>('PROJECT_SCHEMA_SYNC', 'true')) === 'true',
      }),
    }),
    AuthModule,
    CategoriesModule,
  ],
})
export class AppModule {}
