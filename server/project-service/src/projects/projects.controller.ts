import {
  Body,
  Controller,
  Delete,
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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ChangeProjectRoleDto,
  CreateProjectDto,
  InviteProjectMemberDto,
  ListProjectsQueryDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser, @Query() query: ListProjectsQueryDto) {
    return this.projects.list(user, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(user, dto);
  }

  @Post('internal/default')
  createDefault(
    @Headers('x-internal-key') internalKey: string | undefined,
    @Body() body: { workspace_id: number; author_user_id: number; name?: string },
  ) {
    return this.projects.ensureDefaultProject(internalKey, body);
  }

  @Get('internal/search-snapshots')
  searchSnapshots(
    @Headers('x-internal-key') internalKey: string | undefined,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    return this.projects.searchSnapshots(internalKey, Number(page ?? 0), Number(size ?? 200));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.projects.get(user, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProjectDto) {
    return this.projects.update(user, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.projects.remove(user, id);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  archive(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.projects.archive(user, id);
  }

  @Get(':id/permissions/me')
  @UseGuards(JwtAuthGuard)
  permissions(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.projects.permissions(user, id);
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  members(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.projects.members(user, id);
  }

  @Patch(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  changeRole(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: ChangeProjectRoleDto,
  ) {
    return this.projects.changeRole(user, id, userId, dto);
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.projects.removeMember(user, id, userId);
  }

  @Get(':id/invitations')
  @UseGuards(JwtAuthGuard)
  invitations(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.projects.invitations(user, id);
  }

  @Post(':id/invitations')
  @UseGuards(JwtAuthGuard)
  invite(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: InviteProjectMemberDto) {
    return this.projects.invite(user, id, dto);
  }

  @Post('invitations/:token/accept')
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.projects.acceptInvitation(user, token);
  }

  @Post('invitations/:token/reject')
  @UseGuards(JwtAuthGuard)
  reject(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.projects.rejectInvitation(user, token);
  }
}
