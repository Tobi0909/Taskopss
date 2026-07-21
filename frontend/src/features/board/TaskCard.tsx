import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, CheckSquare, MessageSquare, Paperclip } from 'lucide-react'
import type { Task } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  BLOCKED_BADGE_VARIANT,
  BLOCKED_STATE_LABELS,
  formatDueDate,
  formatRelativeDue,
  getDueStatus,
  initials,
  PRIORITY_BADGE_VARIANT,
} from './task-utils'

const PRIORITY_STRIPE: Record<string, string> = {
  P1: 'border-l-priority-p1',
  P2: 'border-l-priority-p2',
  P3: 'border-l-priority-p3',
  P4: 'border-l-priority-p4',
}

export function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const dueStatus = getDueStatus(task)
  const showCreator = task.createdBy && task.createdBy.id !== task.assignee?.id
  const checklistPct =
    task.checklistTotal > 0 ? Math.round((task.checklistDone / task.checklistTotal) * 100) : 0

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'cursor-grab rounded-md border border-l-[4px] border-border bg-card p-2.5 shadow-sm active:cursor-grabbing',
        PRIORITY_STRIPE[task.priority],
        task.priority === 'P1' && 'bg-priority-p1/[0.03]',
        isDragging && 'opacity-40',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <span className="font-mono text-xs text-tertiary-foreground">{task.key}</span>
        <div className="flex items-center gap-1">
          {task.blockedState !== 'NONE' && (
            <Badge variant={BLOCKED_BADGE_VARIANT[task.blockedState]} title={task.blockedReason ?? undefined}>
              {BLOCKED_STATE_LABELS[task.blockedState]}
            </Badge>
          )}
          <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]}>{task.priority}</Badge>
        </div>
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

      {task.checklistTotal > 0 && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckSquare className="h-3 w-3 shrink-0" />
          <span className="shrink-0">
            {task.checklistDone}/{task.checklistTotal}
          </span>
          <div className="h-1 flex-1 rounded-sm bg-secondary">
            <div className="h-full rounded-sm bg-primary" style={{ width: `${checklistPct}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          {showCreator && (
            <Avatar className="h-5 w-5 opacity-70" title={`Tạo bởi ${task.createdBy!.name}`}>
              <AvatarFallback className="text-[9px]">{initials(task.createdBy!.name)}</AvatarFallback>
            </Avatar>
          )}
          {task.assignee && (
            <Avatar title={`Giao cho ${task.assignee.name}`}>
              <AvatarFallback style={{ background: task.assignee.avatarColor, color: '#04211d' }}>
                {initials(task.assignee.name)}
              </AvatarFallback>
            </Avatar>
          )}
          {(task.commentCount > 0 || task.attachmentCount > 0) && (
            <div className="flex items-center gap-2 pl-1">
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

        {task.dueDate && !task.completedAt && (
          <span
            title={formatDueDate(task.dueDate)}
            className={cn(
              'flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[11px] font-medium',
              dueStatus === 'overdue' && 'bg-priority-p1/15 text-priority-p1',
              dueStatus === 'due-soon' && 'bg-priority-p2/15 text-priority-p2',
              dueStatus === 'normal' && 'text-muted-foreground',
            )}
          >
            {dueStatus === 'overdue' && <AlertTriangle className="h-3 w-3" />}
            {formatRelativeDue(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  )
}
