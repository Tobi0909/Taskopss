import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { BoardColumn, Task } from '@/types/api'
import { TaskCard } from './TaskCard'

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
}: {
  column: BoardColumn
  tasks: Task[]
  onTaskClick: (task: Task) => void
}) {
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: 'column' } })

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg bg-secondary/60 p-2">
      <div className="mb-2 flex shrink-0 items-center gap-2 px-1">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {column.name}
        </h2>
        <span className="rounded-sm bg-secondary px-1.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-[40px] flex-1 flex-col gap-2 overflow-y-auto pr-0.5"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
