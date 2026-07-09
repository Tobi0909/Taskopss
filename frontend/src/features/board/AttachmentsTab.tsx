import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Trash2, Upload } from 'lucide-react'
import { useAttachments, useDeleteAttachment, useUploadAttachment } from '@/queries/attachments'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { ApiRequestError, downloadFile } from '@/lib/api'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsTab({ taskId }: { taskId: string }) {
  const { user } = useAuth()
  const { data: attachments } = useAttachments(taskId)
  const upload = useUploadAttachment(taskId)
  const remove = useDeleteAttachment(taskId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function handleDownload(id: string, url: string, filename: string) {
    setDownloadingId(id)
    try {
      await downloadFile(url.replace(/^\/api/, ''), filename)
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không tải được file')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await upload.mutateAsync(file)
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Tải file lên thất bại')
    } finally {
      e.target.value = ''
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá file này?')) return
    try {
      await remove.mutateAsync(id)
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không xoá được file')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {(attachments ?? []).length === 0 && (
        <p className="text-xs text-muted-foreground">Chưa có file đính kèm</p>
      )}
      {attachments?.map((a) => (
        <div key={a.id} className="flex items-center gap-2 rounded-md bg-secondary/60 p-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <button
            type="button"
            onClick={() => handleDownload(a.id, a.downloadUrl, a.originalFilename)}
            disabled={downloadingId === a.id}
            className="flex-1 truncate text-left text-primary hover:underline disabled:opacity-50"
          >
            {downloadingId === a.id ? 'Đang tải...' : a.originalFilename}
          </button>
          <span className="text-xs text-tertiary-foreground">{formatSize(a.sizeBytes)}</span>
          {(a.uploadedBy?.id === user?.id || user?.role === 'ADMIN') && (
            <button type="button" onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => fileInputRef.current?.click()}
        disabled={upload.isPending}
      >
        <Upload className="h-4 w-4" />
        {upload.isPending ? 'Đang tải lên...' : 'Tải file lên'}
      </Button>
    </div>
  )
}
