import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { BlockedState, Priority, Task } from '@/types/api'

export interface TaskFilters {
  boardId?: string
  assigneeId?: string
  creatorId?: string
  columnId?: string
  priority?: Priority
  tagId?: string
  q?: string
  overdue?: boolean
  dueToday?: boolean
  dueThisWeek?: boolean
  createdToday?: boolean
  hasAttachment?: boolean
  hasComment?: boolean
  hasChecklist?: boolean
  blockedState?: BlockedState
  blocked?: boolean
}

function toQueryString(filters: TaskFilters) {
  const params = new URLSearchParams()
  if (filters.boardId) params.set('boardId', filters.boardId)
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId)
  if (filters.creatorId) params.set('creatorId', filters.creatorId)
  if (filters.columnId) params.set('columnId', filters.columnId)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.tagId) params.set('tagId', filters.tagId)
  if (filters.q) params.set('q', filters.q)
  if (filters.overdue) params.set('overdue', 'true')
  if (filters.dueToday) params.set('dueToday', 'true')
  if (filters.dueThisWeek) params.set('dueThisWeek', 'true')
  if (filters.createdToday) params.set('createdToday', 'true')
  if (filters.hasAttachment) params.set('hasAttachment', 'true')
  if (filters.hasComment) params.set('hasComment', 'true')
  if (filters.hasChecklist) params.set('hasChecklist', 'true')
  if (filters.blockedState) params.set('blockedState', filters.blockedState)
  if (filters.blocked) params.set('blocked', 'true')
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
  blockedState?: BlockedState
  blockedReason?: string | null
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
