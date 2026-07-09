import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      task: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
      user: { findMany: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  it('trả về overdueCount trực tiếp từ prisma.task.count', async () => {
    prisma.task.count.mockResolvedValue(3);
    prisma.task.groupBy.mockResolvedValue([]);
    prisma.task.findMany.mockResolvedValue([]);

    const result = await service.getStats();

    expect(result.overdueCount).toBe(3);
  });

  it('điền 0 cho priority không có task mở nào', async () => {
    prisma.task.count.mockResolvedValue(0);
    prisma.task.groupBy.mockImplementation(({ by }: any) => {
      if (by[0] === 'priority') return [{ priority: 'P1', _count: { _all: 2 } }];
      return [];
    });
    prisma.task.findMany.mockResolvedValue([]);

    const result = await service.getStats();

    expect(result.byPriority).toEqual({ P1: 2, P2: 0, P3: 0, P4: 0 });
  });

  it('sắp xếp workload theo số task giảm dần và bỏ qua user không còn tồn tại', async () => {
    prisma.task.count.mockResolvedValue(0);
    prisma.task.groupBy.mockImplementation(({ by }: any) => {
      if (by[0] === 'assigneeId') {
        return [
          { assigneeId: 'user-a', _count: { _all: 2 } },
          { assigneeId: 'user-b', _count: { _all: 5 } },
          { assigneeId: 'user-deleted', _count: { _all: 1 } },
        ];
      }
      return [];
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'user-a', name: 'An', avatarColor: '#1' },
      { id: 'user-b', name: 'Bình', avatarColor: '#2' },
    ]);
    prisma.task.findMany.mockResolvedValue([]);

    const result = await service.getStats();

    expect(result.workloadByAssignee).toEqual([
      { id: 'user-b', name: 'Bình', avatarColor: '#2', openTaskCount: 5 },
      { id: 'user-a', name: 'An', avatarColor: '#1', openTaskCount: 2 },
    ]);
  });

  it('trả về đúng 8 tuần cho weeklyCompletionTrend', async () => {
    prisma.task.count.mockResolvedValue(0);
    prisma.task.groupBy.mockResolvedValue([]);
    prisma.task.findMany.mockResolvedValue([]);

    const result = await service.getStats();

    expect(result.weeklyCompletionTrend).toHaveLength(8);
    expect(result.weeklyCompletionTrend.every((w: any) => w.completedCount === 0)).toBe(true);
  });
});
