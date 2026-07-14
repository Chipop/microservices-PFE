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
import { CategoryRole } from '../entities/category.entity';

export class CreateCategoryDto {
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

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @IsOptional()
  workspace_id?: number;
}

export class ListCategoriesQueryDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  workspace_id?: number;

  @IsOptional()
  @Type(() => Boolean)
  include_archived?: boolean;
}

export class InviteCategoryMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @IsEnum(CategoryRole)
  role: CategoryRole;
}

export class ChangeCategoryRoleDto {
  @IsEnum(CategoryRole)
  role: CategoryRole;
}
