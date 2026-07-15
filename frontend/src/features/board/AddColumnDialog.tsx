import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { BoardColumn } from '@/types/api'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateBoardColumn, useUpdateBoardColumnPosition } from '@/queries/boards'
import { ApiRequestError } from '@/lib/api'

const END_VALUE = '__end__'

interface AddColumnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  columns: BoardColumn[]
}

export function AddColumnDialog({ open, onOpenChange, boardId, columns }: AddColumnDialogProps) {
  const [name, setName] = useState('')
  const [insertBeforeId, setInsertBeforeId] = useState<string>(END_VALUE)
  const createColumn = useCreateBoardColumn()
  const updatePosition = useUpdateBoardColumnPosition(boardId)

  useEffect(() => {
    if (!open) return
    setName('')
    setInsertBeforeId(END_VALUE)
  }, [open])

  const isSaving = createColumn.isPending || updatePosition.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    try {
      const sorted = [...columns].sort((a, b) => a.position - b.position)

      if (insertBeforeId === END_VALUE) {
        await createColumn.mutateAsync({ boardId, name: trimmed })
      } else {
        const target = sorted.find((c) => c.id === insertBeforeId)
        if (!target) return
        const toShift = sorted.filter((c) => c.position >= target.position)
        for (const col of toShift.sort((a, b) => b.position - a.position)) {
          await updatePosition.mutateAsync({ id: col.id, position: col.position + 1 })
        }
        await createColumn.mutateAsync({ boardId, name: trimmed, position: target.position })
      }
      toast.success('Đã thêm cột mới')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Có lỗi xảy ra')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm cột mới</DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="column-name">Tên cột</Label>
            <Input
              id="column-name"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cần xử lý gấp"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Vị trí</Label>
            <Select value={insertBeforeId} onValueChange={setInsertBeforeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={END_VALUE}>Cuối cùng</SelectItem>
                {[...columns]
                  .sort((a, b) => a.position - b.position)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      Trước &quot;{c.name}&quot;
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Thêm cột'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
