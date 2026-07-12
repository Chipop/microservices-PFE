import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProjectRole } from '../entities/project.entity';

export class CreateProjectDto {
  @IsInt()
  @IsPositive()
  workspace_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  workspace_id?: number;
}

export class ListProjectsQueryDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  workspace_id?: number;

  @IsOptional()
  @Type(() => Boolean)
  include_archived?: boolean;
}

export class InviteProjectMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @IsEnum(ProjectRole)
  role: ProjectRole;
}

export class ChangeProjectRoleDto {
  @IsEnum(ProjectRole)
  role: ProjectRole;
}
