import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class ListCommentsQueryDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  task_id?: number;
}

export class CreateCommentDto {
  @IsInt()
  @IsPositive()
  task_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body: string;
}

export class UpdateCommentDto extends PartialType(CreateCommentDto) {
  @IsOptional()
  task_id?: number;
}
