import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MessageSquare, Paperclip } from 'lucide-react'
import type { Task } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { formatDueDate, getDueStatus, PRIORITY_BADGE_VARIANT } from './task-utils'

const PRIORITY_STRIPE: Record<string, string> = {
  P1: 'border-l-priority-p1',
  P2: 'border-l-priority-p2',
  P3: 'border-l-priority-p3',
  P4: 'border-l-priority-p4',
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(-2)
    .join('')
    .toUpperCase()
}

export function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const dueStatus = getDueStatus(task)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-grab rounded-md border border-l-[3px] border-border bg-card p-2.5 shadow-sm active:cursor-grabbing',
        PRIORITY_STRIPE[task.priority],
        isDragging && 'opacity-40',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-xs text-tertiary-foreground">{task.key}</span>
        <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]}>{task.priority}</Badge>
      </div>

      <p className="mb-2 text-sm leading-snug">{task.title}</p>

      {task.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
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
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <Avatar>
              <AvatarFallback style={{ background: task.assignee.avatarColor, color: '#04211d' }}>
                {initials(task.assignee.name)}
              </AvatarFallback>
            </Avatar>
          )}
          {(task.commentCount > 0 || task.attachmentCount > 0) && (
            <div className="flex items-center gap-2">
              {task.commentCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="h-3 w-3" /> {task.commentCount}
                </span>
              )}
              {task.attachmentCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <Paperclip className="h-3 w-3" /> {task.attachmentCount}
                </span>
              )}
            </div>
          )}
        </div>

        {task.dueDate && (
          <span
            className={cn(
              'rounded-sm px-1.5 py-0.5 text-[11px] font-medium',
              dueStatus === 'overdue' && 'bg-priority-p1/15 text-priority-p1',
              dueStatus === 'due-soon' && 'bg-priority-p2/15 text-priority-p2',
              dueStatus === 'normal' && 'text-muted-foreground',
            )}
          >
            {formatDueDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  )
}
