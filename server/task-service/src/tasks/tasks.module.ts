import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  KanbanColumn,
  SavedFilter,
  Subtask,
  Tag,
  Task,
  TaskAssignment,
  TaskDependency,
  TaskRecurrence,
  TaskReminder,
  TaskStatus,
  TaskTag,
} from './entities/task.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskStatus,
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
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
