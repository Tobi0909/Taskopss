import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Comment } from '@/types/api'

export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => apiFetch<Comment[]>(`/tasks/${taskId}/comments`),
    enabled: !!taskId,
  })
}

export function useCreateComment(taskId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<Comment>(`/tasks/${taskId}/comments`, { method: 'POST', body: { body } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteComment(taskId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/comments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
