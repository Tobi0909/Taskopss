import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useActiveUsers } from '@/queries/users'
import { useComments, useCreateComment, useDeleteComment } from '@/queries/comments'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ApiRequestError } from '@/lib/api'
import { renderCommentBody, findMentionQuery, insertMention } from './mentions'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(-2).join('').toUpperCase()
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function CommentsTab({ taskId }: { taskId: string }) {
  const { user } = useAuth()
  const { data: comments } = useComments(taskId)
  const { data: users } = useActiveUsers()
  const createComment = useCreateComment(taskId)
  const deleteComment = useDeleteComment(taskId)

  const [text, setText] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const mentionCandidates =
    mentionQuery !== null
      ? (users ?? []).filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
      : []

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setText(value)
    const cursor = e.target.selectionStart ?? value.length
    setMentionQuery(findMentionQuery(value, cursor))
  }

  function pickMention(name: string, id: string) {
    const cursor = textareaRef.current?.selectionStart ?? text.length
    const result = insertMention(text, cursor, name, id)
    setText(result.value)
    setMentionQuery(null)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(result.cursor, result.cursor)
    })
  }

  async function handleSubmit() {
    if (!text.trim()) return
    try {
      await createComment.mutateAsync(text.trim())
      setText('')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không gửi được bình luận')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xoá bình luận này?')) return
    try {
      await deleteComment.mutateAsync(id)
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Không xoá được bình luận')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
        {(comments ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">Chưa có bình luận nào</p>
        )}
        {comments?.map((c) => (
          <div key={c.id} className="rounded-md bg-secondary/60 p-2">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Avatar>
                  <AvatarFallback
                    style={{ background: c.author?.avatarColor ?? '#6B7280', color: '#04211d' }}
                  >
                    {c.author ? initials(c.author.name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{c.author?.name ?? 'Người dùng đã xoá'}</span>
                <span className="text-[11px] text-tertiary-foreground">{formatTimestamp(c.createdAt)}</span>
                {c.isEdited && <span className="text-[11px] text-tertiary-foreground">(đã sửa)</span>}
              </div>
              {c.authorId === user?.id && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-[11px] text-muted-foreground hover:text-destructive"
                >
                  Xoá
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm">{renderCommentBody(c.body)}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        {mentionCandidates.length > 0 && (
          <div className="absolute bottom-full z-10 mb-1 w-56 rounded-md border border-border bg-popover p-1 shadow-md">
            {mentionCandidates.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => pickMention(u.name, u.id)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-sm hover:bg-accent"
              >
                <Avatar>
                  <AvatarFallback style={{ background: u.avatarColor, color: '#04211d' }}>
                    {initials(u.name)}
                  </AvatarFallback>
                </Avatar>
                {u.name}
              </button>
            ))}
          </div>
        )}
        <Textarea
          ref={textareaRef}
          rows={2}
          placeholder="Viết bình luận... gõ @ để nhắc đồng nghiệp"
          value={text}
          onChange={handleChange}
        />
      </div>
      <Button type="button" size="sm" className="self-end" onClick={handleSubmit} disabled={createComment.isPending}>
        Gửi
      </Button>
    </div>
  )
}
