import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { Todo } from './todos/entities/todo.entity';
import { TodosModule } from './todos/todos.module';

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
        database: config.get<string>('POSTGRES_DB', 'todos'),
        entities: [Todo],
        // Dev microservice: auto-create the schema so the stack is functional
        // with no migration step. Switch to migrations for production.
        synchronize: true,
      }),
    }),
    AuthModule,
    TodosModule,
  ],
})
export class AppModule {}
