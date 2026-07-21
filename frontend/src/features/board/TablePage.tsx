import { useMemo, useState } from 'react'
import { useDefaultBoard } from '@/queries/boards'
import { useTasks, type TaskFilters } from '@/queries/tasks'
import type { Task } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TaskFilterBar, type TaskFilterState } from './TaskFilterBar'
import { TaskFormDialog } from './TaskFormDialog'
import { formatDueDate, getDueStatus, PRIORITY_BADGE_VARIANT } from './task-utils'
import { useBoardRealtime } from '@/features/realtime/useBoardRealtime'
import { cn } from '@/lib/utils'

type SortKey = 'title' | 'priority' | 'dueDate' | 'status'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(-2).join('').toUpperCase()
}

export function TablePage() {
  const { board, isLoading, isError, hasNoBoards } = useDefaultBoard()
  useBoardRealtime(board?.id)
  const [filterState, setFilterState] = useState<TaskFilterState>({
    search: '',
    assigneeId: '',
    creatorId: '',
    columnId: '',
    priority: '',
    tagId: '',
    overdue: false,
    dueToday: false,
    dueThisWeek: false,
    createdToday: false,
    hasAttachment: false,
    hasComment: false,
    hasChecklist: false,
    blocked: false,
  })
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortAsc, setSortAsc] = useState(true)

  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)

  const filters: TaskFilters = useMemo(
    () => ({
      boardId: board?.id,
      q: filterState.search || undefined,
      assigneeId: filterState.assigneeId || undefined,
      creatorId: filterState.creatorId || undefined,
      columnId: filterState.columnId || undefined,
      priority: (filterState.priority as TaskFilters['priority']) || undefined,
      tagId: filterState.tagId || undefined,
      overdue: filterState.overdue || undefined,
      dueToday: filterState.dueToday || undefined,
      dueThisWeek: filterState.dueThisWeek || undefined,
      createdToday: filterState.createdToday || undefined,
      hasAttachment: filterState.hasAttachment || undefined,
      hasComment: filterState.hasComment || undefined,
      hasChecklist: filterState.hasChecklist || undefined,
      blocked: filterState.blocked || undefined,
    }),
    [board?.id, filterState],
  )
  const { data: tasks } = useTasks(filters)

  const sortedTasks = useMemo(() => {
    const list = [...(tasks ?? [])]
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title)
      else if (sortKey === 'priority') cmp = a.priority.localeCompare(b.priority)
      else if (sortKey === 'status') cmp = a.column.name.localeCompare(b.column.name)
      else {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
        cmp = aTime - bTime
      }
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [tasks, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((prev) => !prev)
    else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function SortHeader({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) {
    return (
      <button
        type="button"
        onClick={() => toggleSort(sortKeyValue)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {sortKey === sortKeyValue && <span>{sortAsc ? '↑' : '↓'}</span>}
      </button>
    )
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải...</p>
  if (hasNoBoards) {
    return (
      <p className="text-sm text-muted-foreground">
        Bạn chưa được thêm vào board nào. Liên hệ quản trị viên để được cấp quyền truy cập.
      </p>
    )
  }
  if (isError || !board) return <p className="text-sm text-destructive">Không tải được dữ liệu.</p>

  return (
    <div className="flex flex-col gap-3">
      <TaskFilterBar value={filterState} onChange={setFilterState} columns={board.columns} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead><SortHeader label="Tiêu đề" sortKeyValue="title" /></TableHead>
            <TableHead><SortHeader label="Ưu tiên" sortKeyValue="priority" /></TableHead>
            <TableHead>Người phụ trách</TableHead>
            <TableHead>Nhãn</TableHead>
            <TableHead><SortHeader label="Trạng thái" sortKeyValue="status" /></TableHead>
            <TableHead><SortHeader label="Hạn chót" sortKeyValue="dueDate" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const dueStatus = getDueStatus(task)
            return (
              <TableRow
                key={task.id}
                className="cursor-pointer"
                onClick={() => {
                  setEditingTask(task)
                  setDialogOpen(true)
                }}
              >
                <TableCell className="font-mono text-xs text-tertiary-foreground">{task.key}</TableCell>
                <TableCell>{task.title}</TableCell>
                <TableCell>
                  <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]}>{task.priority}</Badge>
                </TableCell>
                <TableCell>
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar>
                        <AvatarFallback style={{ background: task.assignee.avatarColor, color: '#04211d' }}>
                          {initials(task.assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{task.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Chưa gán</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ background: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{task.column.name}</TableCell>
                <TableCell>
                  {task.dueDate ? (
                    <span
                      className={cn(
                        'text-xs',
                        dueStatus === 'overdue' && 'font-medium text-priority-p1',
                        dueStatus === 'due-soon' && 'font-medium text-priority-p2',
                      )}
                    >
                      {formatDueDate(task.dueDate)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        boardId={board.id}
        columns={board.columns}
        task={editingTask}
      />
    </div>
  )
}
