import { useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { useDefaultBoard } from '@/queries/boards'
import { useTasks, useMoveTask, type TaskFilters } from '@/queries/tasks'
import type { Task } from '@/types/api'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { KanbanColumn } from './KanbanColumn'
import { TaskFormDialog } from './TaskFormDialog'
import { AddColumnDialog } from './AddColumnDialog'
import { TaskFilterBar, type TaskFilterState } from './TaskFilterBar'
import { BoardStatsStrip } from './BoardStatsStrip'
import { useBoardRealtime } from '@/features/realtime/useBoardRealtime'

export function BoardPage() {
  const { user } = useAuth()
  const { board, isLoading, isError } = useDefaultBoard()
  useBoardRealtime(board?.id)
  const [addColumnOpen, setAddColumnOpen] = useState(false)
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
  const moveTask = useMoveTask()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined)
  const [createColumnId, setCreateColumnId] = useState<string | undefined>(undefined)

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks ?? []) {
      const list = map.get(task.column.id) ?? []
      list.push(task)
      map.set(task.column.id, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position)
    }
    return map
  }, [tasks])

  const tasksById = useMemo(() => new Map((tasks ?? []).map((t) => [t.id, t])), [tasks])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeTask = tasksById.get(active.id as string)
    if (!activeTask) return

    let targetColumnId: string
    let overTaskId: string | null = null

    if (over.data.current?.type === 'column') {
      targetColumnId = over.id as string
    } else {
      const overTask = tasksById.get(over.id as string)
      if (!overTask) return
      targetColumnId = overTask.column.id
      overTaskId = overTask.id
    }

    if (targetColumnId === activeTask.column.id && overTaskId === activeTask.id) return

    const columnTasks = (tasksByColumn.get(targetColumnId) ?? []).filter((t) => t.id !== activeTask.id)
    let afterTaskId: string | undefined
    if (overTaskId) {
      const idx = columnTasks.findIndex((t) => t.id === overTaskId)
      afterTaskId = idx > 0 ? columnTasks[idx - 1].id : undefined
    } else {
      afterTaskId = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].id : undefined
    }

    moveTask.mutate({ id: activeTask.id, columnId: targetColumnId, afterTaskId })
  }

  function openCreateDialog(columnId?: string) {
    setEditingTask(undefined)
    setCreateColumnId(columnId)
    setDialogOpen(true)
  }

  function openEditDialog(task: Task) {
    setEditingTask(task)
    setDialogOpen(true)
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải bảng công việc...</p>
  }
  if (isError || !board) {
    return <p className="text-sm text-destructive">Không tải được board. Kiểm tra lại kết nối backend.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <BoardStatsStrip tasks={tasks ?? []} />

      <TaskFilterBar
        value={filterState}
        onChange={setFilterState}
        columns={board.columns}
        trailing={
          <Button size="sm" onClick={() => openCreateDialog()}>
            <Plus className="h-4 w-4" />
            Task mới
          </Button>
        }
      />

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex h-[calc(100vh-190px)] min-h-0 gap-3 overflow-x-auto pb-2">
          {board.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn.get(column.id) ?? []}
              onTaskClick={openEditDialog}
            />
          ))}
          {user?.role === 'ADMIN' && (
            <Button
              type="button"
              variant="outline"
              className="h-9 w-40 shrink-0 self-start"
              onClick={() => setAddColumnOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Thêm cột
            </Button>
          )}
        </div>
      </DndContext>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        boardId={board.id}
        columns={board.columns}
        task={editingTask}
        defaultColumnId={createColumnId ?? board.columns[0]?.id}
      />

      {user?.role === 'ADMIN' && (
        <AddColumnDialog
          open={addColumnOpen}
          onOpenChange={setAddColumnOpen}
          boardId={board.id}
          columns={board.columns}
        />
      )}
    </div>
  )
}
