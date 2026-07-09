import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Role, UserSummary } from '@/types/api'

export function useActiveUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<UserSummary[]>('/users'),
  })
}

export function useAllUsers() {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => apiFetch<UserSummary[]>('/users/all'),
  })
}

export interface CreateMemberInput {
  email: string
  name: string
  password: string
  role?: Role
}

export function useCreateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMemberInput) => apiFetch<UserSummary>('/users', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export interface UpdateMemberInput {
  id: string
  name?: string
  role?: Role
  isActive?: boolean
  password?: string
}

export function useUpdateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateMemberInput) =>
      apiFetch<UserSummary>(`/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
