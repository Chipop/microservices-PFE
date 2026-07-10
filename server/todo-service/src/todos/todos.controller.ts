import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { TodosService } from './todos.service';

// Served at /api/todos (global prefix `api` + controller `todos`), matching the
// gateway route and the original Django service. Every route requires a valid
// shared-secret JWT and is scoped to that user.
@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.todosService.findAll(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTodoDto) {
    return this.todosService.create(user.userId, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.todosService.findOne(user.userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.todosService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.todosService.remove(user.userId, id);
  }
}
