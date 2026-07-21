import { useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { useActiveUsers } from '@/queries/users'
import { useTags } from '@/queries/tags'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'
import type { BoardColumn } from '@/types/api'
import { parseSearchQuery } from './search-dsl'

export interface TaskFilterState {
  search: string
  assigneeId: string
  creatorId: string
  columnId: string
  priority: string
  tagId: string
  overdue: boolean
  dueToday: boolean
  dueThisWeek: boolean
  createdToday: boolean
  hasAttachment: boolean
  hasComment: boolean
  hasChecklist: boolean
  blocked: boolean
}

interface TaskFilterBarProps {
  value: TaskFilterState
  onChange: (value: TaskFilterState) => void
  columns: BoardColumn[]
  trailing?: React.ReactNode
}

const BOOL_TOGGLE_KEYS = ['dueToday', 'dueThisWeek', 'hasAttachment', 'hasComment', 'hasChecklist'] as const

export function TaskFilterBar({ value, onChange, columns, trailing }: TaskFilterBarProps) {
  const { data: users } = useActiveUsers()
  const { data: tags } = useTags()
  const { user } = useAuth()
  const [searchText, setSearchText] = useState(value.search)

  const mineActive = !!user && value.assigneeId === user.id
  const activeToggleCount = BOOL_TOGGLE_KEYS.filter((k) => value[k]).length

  const tokens = useMemo(
    () => parseSearchQuery(searchText, { users: users ?? [], tags: tags ?? [], columns, currentUserId: user?.id }).tokens,
    [searchText, users, tags, columns, user?.id],
  )

  function handleSearchChange(text: string) {
    setSearchText(text)
    const { filters, freeText } = parseSearchQuery(text, {
      users: users ?? [],
      tags: tags ?? [],
      columns,
      currentUserId: user?.id,
    })
    onChange({ ...value, ...filters, search: freeText })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Tìm hoặc lọc: priority:p1 assignee:minh due:today..."
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-72"
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
          value={value.creatorId || 'all'}
          onValueChange={(v) => onChange({ ...value, creatorId: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Người tạo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả người tạo</SelectItem>
            {users?.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.columnId || 'all'}
          onValueChange={(v) => onChange({ ...value, columnId: v === 'all' ? '' : v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {columns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
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

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                  activeToggleCount > 0
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Bộ lọc
                {activeToggleCount > 0 && <Badge variant="default">{activeToggleCount}</Badge>}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="flex flex-col gap-1.5">
                <FilterToggle label="Đến hạn hôm nay" active={value.dueToday} onClick={() => onChange({ ...value, dueToday: !value.dueToday })} />
                <FilterToggle label="Đến hạn tuần này" active={value.dueThisWeek} onClick={() => onChange({ ...value, dueThisWeek: !value.dueThisWeek })} />
                <FilterToggle label="Có file đính kèm" active={value.hasAttachment} onClick={() => onChange({ ...value, hasAttachment: !value.hasAttachment })} />
                <FilterToggle label="Có bình luận" active={value.hasComment} onClick={() => onChange({ ...value, hasComment: !value.hasComment })} />
                <FilterToggle label="Có checklist" active={value.hasChecklist} onClick={() => onChange({ ...value, hasChecklist: !value.hasChecklist })} />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      </div>

      {tokens.length > 0 && (
        <div className="flex flex-wrap gap-1 px-0.5">
          {tokens.map((t, i) => (
            <span
              key={`${t.key}-${i}`}
              className={cn(
                'rounded-sm px-1.5 py-0.5 text-[11px] font-medium',
                t.resolved ? 'bg-primary/10 text-primary' : 'bg-priority-p2/15 text-priority-p2',
              )}
            >
              {t.key}:{t.value}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}
