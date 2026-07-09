import { Injectable } from '@nestjs/common';
import { Priority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildLastNWeeks, startOfIsoWeek } from './dashboard.utils';

const TREND_WEEKS = 8;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const eightWeeksAgo = new Date(now.getTime() - TREND_WEEKS * 7 * 24 * 60 * 60 * 1000);

    const [overdueCount, byPriorityRaw, workloadRaw, completedRecent] = await Promise.all([
      this.prisma.task.count({ where: { completedAt: null, dueDate: { lt: now } } }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: { completedAt: null },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: { completedAt: null, assigneeId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.task.findMany({
        where: { completedAt: { gte: eightWeeksAgo } },
        select: { completedAt: true },
      }),
    ]);

    const byPriority: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
    for (const row of byPriorityRaw) {
      byPriority[row.priority] = row._count._all;
    }

    const assigneeIds = workloadRaw
      .map((row) => row.assigneeId)
      .filter((id): id is string => id !== null);
    const users =
      assigneeIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, name: true, avatarColor: true },
          })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const workloadByAssignee = workloadRaw
      .map((row) => ({ user: userById.get(row.assigneeId as string), openTaskCount: row._count._all }))
      .filter((row): row is { user: NonNullable<typeof row.user>; openTaskCount: number } => !!row.user)
      .sort((a, b) => b.openTaskCount - a.openTaskCount)
      .map((row) => ({
        id: row.user.id,
        name: row.user.name,
        avatarColor: row.user.avatarColor,
        openTaskCount: row.openTaskCount,
      }));

    const weeks = buildLastNWeeks(now, TREND_WEEKS);
    const weekCounts = new Map(weeks.map((week) => [week, 0]));
    for (const task of completedRecent) {
      if (!task.completedAt) continue;
      const weekKey = startOfIsoWeek(task.completedAt);
      if (weekCounts.has(weekKey)) {
        weekCounts.set(weekKey, (weekCounts.get(weekKey) ?? 0) + 1);
      }
    }
    const weeklyCompletionTrend = weeks.map((weekStart) => ({
      weekStart,
      completedCount: weekCounts.get(weekStart) ?? 0,
    }));

    return { overdueCount, byPriority, workloadByAssignee, weeklyCompletionTrend };
  }
}
