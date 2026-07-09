import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { ActivityLogEntry } from '@/types/api'

export function useActivityLog(taskId: string | undefined) {
  return useQuery({
    queryKey: ['activity', taskId],
    queryFn: () => apiFetch<ActivityLogEntry[]>(`/tasks/${taskId}/activity`),
    enabled: !!taskId,
  })
}
