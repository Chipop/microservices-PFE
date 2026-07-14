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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto, ListCommentsQueryDto, UpdateCommentDto } from './dto/comment.dto';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListCommentsQueryDto) {
    return this.comments.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCommentDto) {
    return this.comments.create(user, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.comments.get(user, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCommentDto) {
    return this.comments.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.comments.remove(user, id);
  }
}

@Controller('comments/internal')
export class InternalCommentsController {
  constructor(
    private readonly comments: CommentsService,
    private readonly config: ConfigService,
  ) {}

  @Get('search-snapshots')
  searchSnapshots(
    @Headers('x-internal-key') internalKey: string | undefined,
    @Query('page') page = '0',
    @Query('size') size = '200',
  ) {
    this.requireInternalKey(internalKey);
    return this.comments.searchSnapshots(internalKey, Number(page), Number(size));
  }

  private requireInternalKey(internalKey: string | undefined) {
    const expected = this.config.get<string>('INTERNAL_API_KEY');
    if (!expected || internalKey !== expected) throw new ForbiddenException('Invalid internal API key.');
  }
}
