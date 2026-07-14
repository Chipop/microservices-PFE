import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import {
  KanbanColumn,
  SavedFilter,
  Subtask,
  Tag,
  Task,
  TaskAssignment,
  TaskComment,
  TaskDependency,
  TaskRecurrence,
  TaskReminder,
  TaskStatus,
  TaskTag,
} from './tasks/entities/task.entity';
import { TasksModule } from './tasks/tasks.module';

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
        database: config.get<string>('POSTGRES_DB', 'tasks'),
        entities: [
          Task,
          TaskStatus,
          TaskAssignment,
          TaskComment,
          Tag,
          TaskTag,
          Subtask,
          TaskDependency,
          TaskRecurrence,
          TaskReminder,
          KanbanColumn,
          SavedFilter,
        ],
        // Local compose defaults to schema sync so the refactored service starts
        // without a manual migration step. Set TASK_SCHEMA_SYNC=false for prod.
        synchronize: config.get<string>('TASK_SCHEMA_SYNC', 'true') === 'true',
      }),
    }),
    AuthModule,
    TasksModule,
  ],
})
export class AppModule {}
