import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { ChecklistItem } from '@/types/api'

export function useChecklistItems(taskId: string | undefined) {
  return useQuery({
    queryKey: ['checklist-items', taskId],
    queryFn: () => apiFetch<ChecklistItem[]>(`/tasks/${taskId}/checklist-items`),
    enabled: !!taskId,
  })
}

export function useCreateChecklistItem(taskId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      apiFetch<ChecklistItem>(`/tasks/${taskId}/checklist-items`, { method: 'POST', body: { text } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateChecklistItem(taskId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; text?: string; isDone?: boolean }) =>
      apiFetch<ChecklistItem>(`/checklist-items/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteChecklistItem(taskId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/checklist-items/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
