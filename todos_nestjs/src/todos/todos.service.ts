import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Todo } from './entities/todo.entity';

export interface TodoResponse {
  id: number;
  title: string;
  done: boolean;
  created_at: Date;
}

/**
 * Every method is scoped to the authenticated user's id (from the JWT) — the
 * equivalent of todos_django's `get_queryset().filter(user_id=...)`. A todo
 * belonging to another user is invisible: a 404, never another user's row.
 */
@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private readonly todos: Repository<Todo>,
  ) {}

  private toResponse(todo: Todo): TodoResponse {
    // Never leak user_id back to the client.
    return {
      id: todo.id,
      title: todo.title,
      done: todo.done,
      created_at: todo.created_at,
    };
  }

  async findAll(userId: number): Promise<TodoResponse[]> {
    const rows = await this.todos.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
    return rows.map((t) => this.toResponse(t));
  }

  async create(userId: number, dto: CreateTodoDto): Promise<TodoResponse> {
    const todo = this.todos.create({
      user_id: userId,
      title: dto.title,
      done: dto.done ?? false,
    });
    return this.toResponse(await this.todos.save(todo));
  }

  async findOne(userId: number, id: number): Promise<TodoResponse> {
    return this.toResponse(await this.getOwned(userId, id));
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateTodoDto,
  ): Promise<TodoResponse> {
    const todo = await this.getOwned(userId, id);
    if (dto.title !== undefined) todo.title = dto.title;
    if (dto.done !== undefined) todo.done = dto.done;
    return this.toResponse(await this.todos.save(todo));
  }

  async remove(userId: number, id: number): Promise<void> {
    const todo = await this.getOwned(userId, id);
    await this.todos.remove(todo);
  }

  private async getOwned(userId: number, id: number): Promise<Todo> {
    const todo = await this.todos.findOne({ where: { id, user_id: userId } });
    if (!todo) {
      throw new NotFoundException('Todo not found');
    }
    return todo;
  }
}
