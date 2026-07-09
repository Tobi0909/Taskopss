import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Priority, Task } from '@/types/api'

export interface TaskFilters {
  boardId?: string
  assigneeId?: string
  priority?: Priority
  tagId?: string
  q?: string
  overdue?: boolean
}

function toQueryString(filters: TaskFilters) {
  const params = new URLSearchParams()
  if (filters.boardId) params.set('boardId', filters.boardId)
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.tagId) params.set('tagId', filters.tagId)
  if (filters.q) params.set('q', filters.q)
  if (filters.overdue) params.set('overdue', 'true')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => apiFetch<Task[]>(`/tasks${toQueryString(filters)}`),
    enabled: !!filters.boardId,
  })
}

export interface CreateTaskInput {
  boardId: string
  columnId: string
  title: string
  description?: string
  priority?: Priority
  assigneeId?: string
  dueDate?: string
  tagIds?: string[]
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => apiFetch<Task>('/tasks', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export interface UpdateTaskInput {
  id: string
  title?: string
  description?: string
  priority?: Priority
  assigneeId?: string | null
  dueDate?: string | null
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTaskInput) =>
      apiFetch<Task>(`/tasks/${id}`, { method: 'PATCH', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useMoveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, columnId, afterTaskId }: { id: string; columnId: string; afterTaskId?: string }) =>
      apiFetch<Task>(`/tasks/${id}/move`, { method: 'PATCH', body: { columnId, afterTaskId } }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useSetTaskTags() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tagIds }: { id: string; tagIds: string[] }) =>
      apiFetch<Task>(`/tasks/${id}/tags`, { method: 'PUT', body: { tagIds } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
