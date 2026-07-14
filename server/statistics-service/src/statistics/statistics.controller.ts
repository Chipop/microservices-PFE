import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @Get('overview')
  overview(
    @CurrentUser() user: AuthUser,
    @Query('workspace_id') workspaceId?: string,
    @Query('category_id') categoryId?: string,
    @Query('priority') priority?: string,
    @Query('status') status?: string,
  ) {
    return this.statistics.overview(user, {
      workspaceId: workspaceId ? Number(workspaceId) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      priority,
      status,
    });
  }
}
