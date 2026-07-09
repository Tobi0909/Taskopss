import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Tag } from '@/types/api'

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch<Tag[]>('/tags'),
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; color?: string }) =>
      apiFetch<Tag>('/tags', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}
