import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { BoardColumn, Priority, Task } from '@/types/api'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useActiveUsers } from '@/queries/users'
import { useCreateTag, useTags } from '@/queries/tags'
import { useCreateTask, useDeleteTask, useMoveTask, useSetTaskTags, useUpdateTask } from '@/queries/tasks'
import { cn } from '@/lib/utils'
import { ApiRequestError } from '@/lib/api'
import { toDatetimeLocalValue } from './task-utils'
import { CommentsTab } from './CommentsTab'
import { AttachmentsTab } from './AttachmentsTab'
import { ActivityTab } from './ActivityTab'

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4']
const TAG_COLOR_PALETTE = ['#4C8DFF', '#F5A524', '#F0575A', '#22B8B0', '#8B92C9', '#6B7280']

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  columns: BoardColumn[]
  task?: Task
  defaultColumnId?: string
}

export function TaskFormDialog({
  open,
  onOpenChange,
  boardId,
  columns,
  task,
  defaultColumnId,
}: TaskFormDialogProps) {
  const isEdit = !!task
  const { data: users } = useActiveUsers()
  const { data: tags } = useTags()
  const createTag = useCreateTag()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const moveTask = useMoveTask()
  const setTaskTags = useSetTaskTags()
  const deleteTask = useDeleteTask()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('P3')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [columnId, setColumnId] = useState<string>('')
  const [dueDate, setDueDate] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [newTagName, setNewTagName] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setPriority(task?.priority ?? 'P3')
    setAssigneeId(task?.assignee?.id ?? '')
    setColumnId(task?.column.id ?? defaultColumnId ?? columns[0]?.id ?? '')
    setDueDate(task?.dueDate ? toDatetimeLocalValue(task.dueDate) : '')
    setSelectedTagIds(new Set(task?.tags.map((t) => t.id) ?? []))
    setNewTagName('')
  }, [open, task, defaultColumnId, columns])

  const isSaving = createTask.isPending || updateTask.isPending || moveTask.isPending || setTaskTags.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const dueDateIso = dueDate ? new Date(dueDate).toISOString() : null

    try {
      if (isEdit && task) {
        await updateTask.mutateAsync({
          id: task.id,
          title,
          description,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDateIso,
        })
        if (columnId !== task.column.id) {
          await moveTask.mutateAsync({ id: task.id, columnId })
        }
        const currentTagIds = new Set(task.tags.map((t) => t.id))
        const changed =
          currentTagIds.size !== selectedTagIds.size ||
          [...selectedTagIds].some((id) => !currentTagIds.has(id))
        if (changed) {
          await setTaskTags.mutateAsync({ id: task.id, tagIds: [...selectedTagIds] })
        }
        toast.success('Đã lưu thay đổi')
      } else {
        await createTask.mutateAsync({
          boardId,
          columnId,
          title,
          description,
          priority,
          assigneeId: assigneeId || undefined,
          dueDate: dueDateIso || undefined,
          tagIds: [...selectedTagIds],
        })
        toast.success('Đã tạo task mới')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Có lỗi xảy ra')
    }
  }

  async function handleDelete() {
    if (!task) return
    if (!confirm(`Xoá task ${task.key}?`)) return
    try {
      await deleteTask.mutateAsync(task.id)
      toast.success('Đã xoá task')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Có lỗi xảy ra')
    }
  }

  async function handleAddTag() {
    const name = newTagName.trim()
    if (!name) return
    try {
      const color = TAG_COLOR_PALETTE[Math.floor(Math.random() * TAG_COLOR_PALETTE.length)];
      const tag = await createTag.mutateAsync({ name, color })
      setSelectedTagIds((prev) => new Set(prev).add(tag.id))
      setNewTagName('')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không thể tạo nhãn')
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Sửa task ${task?.key}` : 'Task mới'}</DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Chi tiết</TabsTrigger>
            {isEdit && task && (
              <>
                <TabsTrigger value="comments">Bình luận{task.commentCount > 0 ? ` (${task.commentCount})` : ''}</TabsTrigger>
                <TabsTrigger value="attachments">
                  File{task.attachmentCount > 0 ? ` (${task.attachmentCount})` : ''}
                </TabsTrigger>
                <TabsTrigger value="activity">Lịch sử</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="details" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Tiêu đề</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Người phụ trách</Label>
              <Select value={assigneeId || 'none'} onValueChange={(v) => setAssigneeId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Chưa gán --</SelectItem>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Hạn chót</Label>
              <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Ưu tiên</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Trạng thái</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Nhãn</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags?.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    'rounded-sm px-2 py-0.5 text-xs font-medium text-white transition-opacity',
                    selectedTagIds.has(tag.id) ? 'opacity-100' : 'opacity-40',
                  )}
                  style={{ background: tag.color }}
                >
                  {tag.name}
                </button>
              ))}
              {(!tags || tags.length === 0) && (
                <span className="text-xs text-muted-foreground">Chưa có nhãn nào</span>
              )}
            </div>
            <div className="flex gap-1.5">
              <Input
                placeholder="Tên nhãn mới"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="h-7 text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                + Nhãn
              </Button>
            </div>
          </div>
          </TabsContent>

          {isEdit && task && (
            <>
              <TabsContent value="comments">
                <CommentsTab taskId={task.id} />
              </TabsContent>
              <TabsContent value="attachments">
                <AttachmentsTab taskId={task.id} />
              </TabsContent>
              <TabsContent value="activity">
                <ActivityTab taskId={task.id} columns={columns} users={users ?? []} />
              </TabsContent>
            </>
          )}
        </Tabs>

          <DialogFooter>
            {isEdit && (
              <Button type="button" variant="destructive" size="sm" className="mr-auto" onClick={handleDelete}>
                Xoá
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
