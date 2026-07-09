import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Attachment } from '@/types/api'

export function useAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => apiFetch<Attachment[]>(`/tasks/${taskId}/attachments`),
    enabled: !!taskId,
  })
}

export function useUploadAttachment(taskId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFetch<Attachment>(`/tasks/${taskId}/attachments`, { method: 'POST', body: formData })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteAttachment(taskId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/attachments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
