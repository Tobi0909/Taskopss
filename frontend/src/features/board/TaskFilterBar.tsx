import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useActiveUsers } from '@/queries/users'
import { useTags } from '@/queries/tags'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'

export interface TaskFilterState {
  search: string
  assigneeId: string
  priority: string
  tagId: string
  overdue: boolean
}

interface TaskFilterBarProps {
  value: TaskFilterState
  onChange: (value: TaskFilterState) => void
  trailing?: React.ReactNode
}

export function TaskFilterBar({ value, onChange, trailing }: TaskFilterBarProps) {
  const { data: users } = useActiveUsers()
  const { data: tags } = useTags()
  const { user } = useAuth()

  const mineActive = !!user && value.assigneeId === user.id

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Tìm theo tiêu đề..."
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        className="w-56"
      />
      <Select
        value={value.assigneeId || 'all'}
        onValueChange={(v) => onChange({ ...value, assigneeId: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Người phụ trách" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả người phụ trách</SelectItem>
          {users?.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.priority || 'all'}
        onValueChange={(v) => onChange({ ...value, priority: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Ưu tiên" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả ưu tiên</SelectItem>
          <SelectItem value="P1">P1</SelectItem>
          <SelectItem value="P2">P2</SelectItem>
          <SelectItem value="P3">P3</SelectItem>
          <SelectItem value="P4">P4</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.tagId || 'all'} onValueChange={(v) => onChange({ ...value, tagId: v === 'all' ? '' : v })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Nhãn" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả nhãn</SelectItem>
          {tags?.map((tag) => (
            <SelectItem key={tag.id} value={tag.id}>
              {tag.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ ...value, assigneeId: mineActive ? '' : (user?.id ?? '') })}
          className={cn(
            'rounded-md border px-2.5 py-1.5 text-sm transition-colors',
            mineActive
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          Của tôi
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, overdue: !value.overdue })}
          className={cn(
            'rounded-md border px-2.5 py-1.5 text-sm transition-colors',
            value.overdue
              ? 'border-priority-p1 bg-priority-p1/10 text-priority-p1'
              : 'border-border text-muted-foreground hover:text-foreground',
          )}
        >
          Quá hạn
        </button>
      </div>

      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
    </div>
  )
}
