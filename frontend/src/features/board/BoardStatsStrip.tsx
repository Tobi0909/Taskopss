import type { Task } from '@/types/api'
import { StatCard } from '@/features/dashboard/StatCard'
import { getDueStatus } from './task-utils'

export function BoardStatsStrip({ tasks }: { tasks: Task[] }) {
  const total = tasks.length
  const done = tasks.filter((t) => t.completedAt !== null).length
  const overdue = tasks.filter((t) => getDueStatus(t) === 'overdue').length
  const blocked = tasks.filter((t) => t.blockedState !== 'NONE').length

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard label="Tổng số task" value={total} />
      <StatCard label="Hoàn thành" value={done} tone="primary" />
      <StatCard label="Quá hạn" value={overdue} tone="destructive" />
      <StatCard label="Bị chặn" value={blocked} tone="destructive" />
    </div>
  )
}
