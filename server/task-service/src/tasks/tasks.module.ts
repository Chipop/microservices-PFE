import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
} from './entities/task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { DomainEventPublisher } from '../events/domain-event.publisher';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService, DomainEventPublisher],
})
export class TasksModule {}
