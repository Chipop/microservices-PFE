import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AddDependencyDto,
  AddTagDto,
  AssignTaskDto,
  CreateCommentDto,
  CreateKanbanColumnDto,
  CreateReminderDto,
  CreateSavedFilterDto,
  CreateStatusDto,
  CreateSubtaskDto,
  CreateTaskDto,
  ListTasksQueryDto,
  UpdateKanbanColumnDto,
  UpdateCommentDto,
  UpdateSavedFilterDto,
  UpdateStatusDto,
  UpdateSubtaskDto,
  UpdateTaskDto,
  UpsertRecurrenceDto,
} from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListTasksQueryDto) {
    return this.tasksService.findAll(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  @Get('statuses')
  listStatuses(@CurrentUser() user: AuthUser) {
    return this.tasksService.listStatuses(user.userId);
  }

  @Post('statuses')
  createStatus(@CurrentUser() user: AuthUser, @Body() dto: CreateStatusDto) {
    return this.tasksService.createStatus(user.userId, dto);
  }

  @Patch('statuses/:statusId')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('statusId', ParseIntPipe) statusId: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.tasksService.updateStatus(user.userId, statusId, dto);
  }

  @Delete('statuses/:statusId')
  @HttpCode(204)
  removeStatus(
    @CurrentUser() user: AuthUser,
    @Param('statusId', ParseIntPipe) statusId: number,
  ) {
    return this.tasksService.removeStatus(user.userId, statusId);
  }

  @Get('kanban-columns')
  listKanbanColumns(@CurrentUser() user: AuthUser) {
    return this.tasksService.listKanbanColumns(user.userId);
  }

  @Post('kanban-columns')
  createKanbanColumn(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateKanbanColumnDto,
  ) {
    return this.tasksService.createKanbanColumn(user.userId, dto);
  }

  @Patch('kanban-columns/:columnId')
  updateKanbanColumn(
    @CurrentUser() user: AuthUser,
    @Param('columnId', ParseIntPipe) columnId: number,
    @Body() dto: UpdateKanbanColumnDto,
  ) {
    return this.tasksService.updateKanbanColumn(user.userId, columnId, dto);
  }

  @Delete('kanban-columns/:columnId')
  @HttpCode(204)
  removeKanbanColumn(
    @CurrentUser() user: AuthUser,
    @Param('columnId', ParseIntPipe) columnId: number,
  ) {
    return this.tasksService.removeKanbanColumn(user.userId, columnId);
  }

  @Get('saved-filters')
  listSavedFilters(@CurrentUser() user: AuthUser) {
    return this.tasksService.listSavedFilters(user.userId);
  }

  @Post('saved-filters')
  createSavedFilter(@CurrentUser() user: AuthUser, @Body() dto: CreateSavedFilterDto) {
    return this.tasksService.createSavedFilter(user.userId, dto);
  }

  @Patch('saved-filters/:filterId')
  updateSavedFilter(
    @CurrentUser() user: AuthUser,
    @Param('filterId', ParseIntPipe) filterId: number,
    @Body() dto: UpdateSavedFilterDto,
  ) {
    return this.tasksService.updateSavedFilter(user.userId, filterId, dto);
  }

  @Delete('saved-filters/:filterId')
  @HttpCode(204)
  removeSavedFilter(
    @CurrentUser() user: AuthUser,
    @Param('filterId', ParseIntPipe) filterId: number,
  ) {
    return this.tasksService.removeSavedFilter(user.userId, filterId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(user, id);
  }

  @Get(':id/permissions')
  permissions(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.taskPermission(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(user, id);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.complete(user, id);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.archive(user, id);
  }

  @Post(':id/assignments')
  addAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTaskDto,
  ) {
    return this.tasksService.addAssignment(user, id, dto);
  }

  @Delete(':id/assignments/:assigneeUserId')
  @HttpCode(204)
  removeAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('assigneeUserId', ParseIntPipe) assigneeUserId: number,
  ) {
    return this.tasksService.removeAssignment(user, id, assigneeUserId);
  }

  @Post(':id/tags')
  addTag(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTagDto,
  ) {
    return this.tasksService.addTag(user, id, dto);
  }

  @Delete(':id/tags/:tagId')
  @HttpCode(204)
  removeTag(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('tagId', ParseIntPipe) tagId: number,
  ) {
    return this.tasksService.removeTag(user, id, tagId);
  }

  @Post(':id/subtasks')
  createSubtask(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.tasksService.createSubtask(user, id, dto);
  }

  @Patch(':id/subtasks/:subtaskId')
  updateSubtask(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('subtaskId', ParseIntPipe) subtaskId: number,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.tasksService.updateSubtask(user, id, subtaskId, dto);
  }

  @Delete(':id/subtasks/:subtaskId')
  @HttpCode(204)
  removeSubtask(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('subtaskId', ParseIntPipe) subtaskId: number,
  ) {
    return this.tasksService.removeSubtask(user, id, subtaskId);
  }

  @Post(':id/dependencies')
  addDependency(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddDependencyDto,
  ) {
    return this.tasksService.addDependency(user, id, dto);
  }

  @Delete(':id/dependencies/:dependencyId')
  @HttpCode(204)
  removeDependency(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('dependencyId', ParseIntPipe) dependencyId: number,
  ) {
    return this.tasksService.removeDependency(user, id, dependencyId);
  }

  @Put(':id/recurrence')
  upsertRecurrence(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertRecurrenceDto,
  ) {
    return this.tasksService.upsertRecurrence(user, id, dto);
  }

  @Post(':id/reminders')
  createReminder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReminderDto,
  ) {
    return this.tasksService.createReminder(user, id, dto);
  }

  @Delete(':id/reminders/:reminderId')
  @HttpCode(204)
  removeReminder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('reminderId', ParseIntPipe) reminderId: number,
  ) {
    return this.tasksService.removeReminder(user, id, reminderId);
  }

  @Get(':id/comments')
  listComments(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.listComments(user, id);
  }

  @Post(':id/comments')
  createComment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.tasksService.createComment(user, id, dto);
  }

  @Patch(':id/comments/:commentId')
  updateComment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.tasksService.updateComment(user, id, commentId, dto);
  }

  @Delete(':id/comments/:commentId')
  @HttpCode(204)
  removeComment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.tasksService.removeComment(user, id, commentId);
  }

  @Get(':id/comments/:commentId/permissions')
  commentPermissions(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.tasksService.commentPermission(user, id, commentId);
  }
}

@Controller('tasks/internal')
export class InternalTasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly config: ConfigService,
  ) {}

  @Get('search-snapshots')
  taskSearchSnapshots(
    @Headers('x-internal-key') internalKey: string | undefined,
    @Query('page') page = '0',
    @Query('size') size = '200',
  ) {
    this.requireInternalKey(internalKey);
    return this.tasksService.taskSearchSnapshots(Number(page), Number(size));
  }

  @Get('comment-search-snapshots')
  commentSearchSnapshots(
    @Headers('x-internal-key') internalKey: string | undefined,
    @Query('page') page = '0',
    @Query('size') size = '200',
  ) {
    this.requireInternalKey(internalKey);
    return this.tasksService.commentSearchSnapshots(Number(page), Number(size));
  }

  private requireInternalKey(internalKey: string | undefined) {
    const expected = this.config.get<string>('INTERNAL_API_KEY');
    if (!expected || internalKey !== expected) {
      throw new ForbiddenException('Invalid internal API key.');
    }
  }
}
