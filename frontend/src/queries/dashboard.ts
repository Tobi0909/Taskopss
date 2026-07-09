import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { DashboardStats } from '@/types/api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => apiFetch<DashboardStats>('/dashboard/stats'),
  })
}
