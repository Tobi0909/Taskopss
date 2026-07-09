import { useDashboardStats } from '@/queries/dashboard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(-2).join('').toUpperCase()
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: 'destructive' | 'primary' }) {
  return (
    <div className="rounded-md bg-secondary/60 p-3">
      <p className="mb-1.5 text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === 'destructive'
            ? 'text-xl font-medium text-priority-p1'
            : tone === 'primary'
              ? 'text-xl font-medium text-primary'
              : 'text-xl font-medium'
        }
      >
        {value}
      </p>
    </div>
  )
}

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardStats()

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>
  if (isError || !data) return <p className="text-sm text-destructive">Không tải được số liệu.</p>

  const lastWeek = data.weeklyCompletionTrend[data.weeklyCompletionTrend.length - 1]
  const maxWorkload = Math.max(1, ...data.workloadByAssignee.map((w) => w.openTaskCount))
  const maxWeekly = Math.max(1, ...data.weeklyCompletionTrend.map((w) => w.completedCount))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Task quá hạn" value={data.overdueCount} tone="destructive" />
        <StatCard label="P1 đang mở" value={data.byPriority.P1} />
        <StatCard label="P2 đang mở" value={data.byPriority.P2} />
        <StatCard label="Hoàn thành tuần này" value={lastWeek?.completedCount ?? 0} tone="primary" />
      </div>

      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-3 text-sm font-medium">Workload theo người phụ trách</h3>
          {data.workloadByAssignee.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có task nào được gán</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.workloadByAssignee.map((w) => (
                <div key={w.id} className="flex items-center gap-2 text-sm">
                  <div className="flex w-32 shrink-0 items-center gap-1.5">
                    <Avatar>
                      <AvatarFallback style={{ background: w.avatarColor, color: '#04211d' }}>
                        {initials(w.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-xs">{w.name}</span>
                  </div>
                  <div className="h-3.5 flex-1 rounded-sm bg-secondary">
                    <div
                      className="h-full rounded-sm bg-primary"
                      style={{ width: `${(w.openTaskCount / maxWorkload) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-muted-foreground">{w.openTaskCount}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <h3 className="mb-3 text-sm font-medium">Tốc độ hoàn thành (8 tuần gần nhất)</h3>
          <div className="flex h-32 items-end gap-2">
            {data.weeklyCompletionTrend.map((w) => (
              <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-primary"
                  style={{ height: `${(w.completedCount / maxWeekly) * 100}%`, minHeight: w.completedCount > 0 ? 4 : 0 }}
                />
                <span className="text-[10px] text-tertiary-foreground">{w.completedCount}</span>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            {data.weeklyCompletionTrend.map((w) => (
              <span key={w.weekStart} className="flex-1 text-center text-[10px] text-tertiary-foreground">
                {w.weekStart.slice(5)}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
