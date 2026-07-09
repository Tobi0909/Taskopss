import { useActivityLog } from '@/queries/activity'
import type { ActivityLogEntry, BoardColumn, UserSummary } from '@/types/api'

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function columnName(columns: BoardColumn[], id: unknown) {
  return columns.find((c) => c.id === id)?.name ?? 'không rõ'
}

function userName(users: UserSummary[], id: unknown) {
  if (!id) return 'chưa gán'
  return users.find((u) => u.id === id)?.name ?? 'người dùng đã xoá'
}

function describeActivity(entry: ActivityLogEntry, columns: BoardColumn[], users: UserSummary[]): string {
  const meta = entry.metadata ?? {}
  switch (entry.action) {
    case 'CREATED':
      return 'đã tạo task này'
    case 'STATUS_CHANGED':
      return `đã chuyển từ "${columnName(columns, meta.from)}" sang "${columnName(columns, meta.to)}"`
    case 'ASSIGNED':
      return `đã gán cho ${userName(users, meta.to)}`
    case 'UNASSIGNED':
      return 'đã bỏ gán người phụ trách'
    case 'PRIORITY_CHANGED':
      return `đã đổi ưu tiên từ ${meta.from} sang ${meta.to}`
    case 'DUE_DATE_CHANGED':
      return `đã đổi hạn chót thành ${meta.to ? new Date(meta.to as string).toLocaleDateString('vi-VN') : 'không có'}`
    case 'TAG_ADDED':
      return `đã thêm nhãn "${meta.name}"`
    case 'TAG_REMOVED':
      return `đã xoá nhãn "${meta.name}"`
    case 'ATTACHMENT_ADDED':
      return `đã tải lên file "${meta.filename}"`
    case 'ATTACHMENT_REMOVED':
      return `đã xoá file "${meta.filename}"`
    default:
      return entry.action
  }
}

export function ActivityTab({
  taskId,
  columns,
  users,
}: {
  taskId: string
  columns: BoardColumn[]
  users: UserSummary[]
}) {
  const { data: entries } = useActivityLog(taskId)

  if (!entries || entries.length === 0) {
    return <p className="text-xs text-muted-foreground">Chưa có lịch sử thay đổi</p>
  }

  return (
    <div className="flex max-h-64 flex-col gap-2 overflow-y-auto text-sm">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-2">
          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
          <p>
            <span className="font-medium">{entry.actor?.name ?? 'Hệ thống'}</span>{' '}
            <span className="text-muted-foreground">{describeActivity(entry, columns, users)}</span>{' '}
            <span className="text-[11px] text-tertiary-foreground">{formatTimestamp(entry.createdAt)}</span>
          </p>
        </div>
      ))}
    </div>
  )
}
