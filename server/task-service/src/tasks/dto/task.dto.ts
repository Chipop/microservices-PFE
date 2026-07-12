import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @IsInt()
  @IsPositive()
  project_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  due_at?: string | null;

  @IsOptional()
  @IsPositive()
  status_id?: number;

  @IsOptional()
  @IsPositive()
  kanban_column_id?: number | null;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body: string;
}

export class UpdateCommentDto extends PartialType(CreateCommentDto) {}

export class AssignTaskDto {
  @IsInt()
  @IsPositive()
  assignee_user_id: number;
}

export class AddTagDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  tag_id?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;
}

export class CreateSubtaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateSubtaskDto extends PartialType(CreateSubtaskDto) {}

export class AddDependencyDto {
  @IsInt()
  @IsPositive()
  depends_on_task_id: number;
}

export class UpsertRecurrenceDto {
  @IsBoolean()
  enabled: boolean;

  @IsObject()
  rule: Record<string, unknown>;
}

export class CreateReminderDto {
  @IsDateString()
  remind_at: string;
}

export class CreateStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  is_terminal?: boolean;
}

export class UpdateStatusDto extends PartialType(CreateStatusDto) {}

export class CreateKanbanColumnDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateKanbanColumnDto extends PartialType(CreateKanbanColumnDto) {}

export class CreateSavedFilterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsObject()
  criteria: Record<string, unknown>;
}

export class UpdateSavedFilterDto extends PartialType(CreateSavedFilterDto) {}

export class ListTasksQueryDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  workspace_id?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  project_id?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  include_archived?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  status_id?: number;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
