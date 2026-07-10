import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
