import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TaskSnapshot {
  id?: number;
  category_id?: number | null;
  project_id?: number | null;
  workspace_id?: number | null;
  status?: string;
  priority?: string;
  completed_at?: string | null;
}

interface OverviewFilters {
  workspaceId?: number;
  categoryId?: number;
  priority?: string;
  status?: string;
}

@Injectable()
export class StatisticsService {
  constructor(private readonly config: ConfigService) {}

  async overview(user: { token: string }, filters: OverviewFilters) {
    const tasks = (await this.fetchVisibleTasks(user, filters)).filter((task) => this.matches(task, filters));
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === 'done' || Boolean(task.completed_at)).length;
    return {
      totalTasks: total,
      completedTasks: completed,
      completionRate: total ? Math.round((completed / total) * 1000) / 10 : 0,
      byStatus: this.distribution(tasks, (task) => task.status ?? 'unknown'),
      byCategory: this.distribution(tasks, (task) => String(task.category_id ?? task.project_id ?? 'uncategorized')),
      byPriority: this.distribution(tasks, (task) => task.priority ?? 'normal'),
      trends: this.dailyCompletedTrend(tasks),
    };
  }

  private async fetchVisibleTasks(user: { token: string }, filters: OverviewFilters) {
    const params = new URLSearchParams();
    if (filters.workspaceId) params.set('workspace_id', String(filters.workspaceId));
    if (filters.categoryId) params.set('category_id', String(filters.categoryId));
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.status) params.set('status', filters.status);
    const query = params.toString();
    const response = await fetch(`${this.taskBaseUrl()}/api/tasks/${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (response.status === 401 || response.status === 403) throw new ForbiddenException('Task statistics access denied.');
    if (!response.ok) throw new ForbiddenException('Task statistics source is unavailable.');
    return (await response.json()) as TaskSnapshot[];
  }

  private matches(task: TaskSnapshot, filters: OverviewFilters) {
    if (filters.workspaceId && task.workspace_id !== filters.workspaceId) return false;
    if (filters.categoryId && (task.category_id ?? task.project_id) !== filters.categoryId) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.status && task.status !== filters.status) return false;
    return true;
  }

  private distribution(tasks: TaskSnapshot[], key: (task: TaskSnapshot) => string) {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      const itemKey = key(task);
      acc[itemKey] = (acc[itemKey] ?? 0) + 1;
      return acc;
    }, {});
  }

  private dailyCompletedTrend(tasks: TaskSnapshot[]) {
    return this.distribution(
      tasks.filter((task) => task.completed_at),
      (task) => String(task.completed_at).slice(0, 10),
    );
  }

  private taskBaseUrl(): string {
    return this.config.get<string>('TASK_SERVICE_BASE_URL', 'http://task-service:8000').replace(/\/+$/, '');
  }
}
