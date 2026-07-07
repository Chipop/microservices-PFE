import { PartialType } from '@nestjs/mapped-types';
import { CreateTodoDto } from './create-todo.dto';

// title? and done? — both optional. Matches the Django serializer where the
// client may PATCH either field.
export class UpdateTodoDto extends PartialType(CreateTodoDto) {}
