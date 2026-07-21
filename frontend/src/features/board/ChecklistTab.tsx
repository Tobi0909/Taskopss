import { useState } from 'react'
import { toast } from 'sonner'
import { CheckSquare, Square, Trash2 } from 'lucide-react'
import {
  useChecklistItems,
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useUpdateChecklistItem,
} from '@/queries/checklist'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ApiRequestError } from '@/lib/api'
import { cn } from '@/lib/utils'

export function ChecklistTab({ taskId }: { taskId: string }) {
  const { data: items } = useChecklistItems(taskId)
  const createItem = useCreateChecklistItem(taskId)
  const updateItem = useUpdateChecklistItem(taskId)
  const deleteItem = useDeleteChecklistItem(taskId)
  const [newText, setNewText] = useState('')

  async function handleAdd() {
    const text = newText.trim()
    if (!text) return
    try {
      await createItem.mutateAsync(text)
      setNewText('')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không thêm được mục checklist')
    }
  }

  async function handleToggle(id: string, isDone: boolean) {
    try {
      await updateItem.mutateAsync({ id, isDone: !isDone })
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Có lỗi xảy ra')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteItem.mutateAsync(id)
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không xoá được mục checklist')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {(items ?? []).length === 0 && (
        <p className="text-xs text-muted-foreground">Chưa có mục checklist nào</p>
      )}
      {items?.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-md bg-secondary/60 p-2 text-sm">
          <button type="button" onClick={() => handleToggle(item.id, item.isDone)} className="shrink-0 text-muted-foreground">
            {item.isDone ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
          </button>
          <span className={cn('flex-1', item.isDone && 'text-muted-foreground line-through')}>{item.text}</span>
          <button type="button" onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex gap-1.5">
        <Input
          placeholder="Thêm mục checklist..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          className="h-8 text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={createItem.isPending}>
          + Thêm
        </Button>
      </div>
    </div>
  )
}
