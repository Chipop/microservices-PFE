import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  KanbanColumn,
  SavedFilter,
  Subtask,
  Tag,
  Task,
  TaskActivity,
  TaskAssignment,
  TaskDependency,
  TaskRecurrence,
  TaskReminder,
  TaskTag,
} from './entities/task.entity';
import { InternalTasksController, TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { DomainEventPublisher } from '../events/domain-event.publisher';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskActivity,
      TaskAssignment,
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
  controllers: [TasksController, InternalTasksController],
  providers: [TasksService, DomainEventPublisher],
})
export class TasksModule {}
