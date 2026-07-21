import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Board, BoardColumn, BoardMember, BoardRole, BoardWithColumns } from '@/types/api'

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: () => apiFetch<Board[]>('/boards'),
  })
}

export function useBoard(boardId: string | undefined) {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: () => apiFetch<BoardWithColumns>(`/boards/${boardId}`),
    enabled: !!boardId,
  })
}

export function useDefaultBoard() {
  const boardsQuery = useBoards()
  const defaultBoardId = boardsQuery.data?.[0]?.id
  const boardQuery = useBoard(defaultBoardId)
  const hasNoBoards = boardsQuery.isSuccess && boardsQuery.data.length === 0
  return {
    board: boardQuery.data,
    isLoading: boardsQuery.isLoading || boardQuery.isLoading,
    isError: boardsQuery.isError || boardQuery.isError,
    hasNoBoards,
  }
}

export interface CreateBoardColumnInput {
  boardId: string
  name: string
  position?: number
  isDoneColumn?: boolean
}

export function useCreateBoardColumn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, ...body }: CreateBoardColumnInput) =>
      apiFetch<BoardColumn>(`/boards/${boardId}/columns`, { method: 'POST', body }),
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ['boards', variables.boardId] }),
  })
}

export function useUpdateBoardColumnPosition(boardId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      apiFetch<BoardColumn>(`/columns/${id}`, { method: 'PATCH', body: { position } }),
    onSuccess: () => {
      if (boardId) queryClient.invalidateQueries({ queryKey: ['boards', boardId] })
    },
  })
}

export function useBoardMembers(boardId: string | undefined) {
  return useQuery({
    queryKey: ['boards', boardId, 'members'],
    queryFn: () => apiFetch<BoardMember[]>(`/boards/${boardId}/members`),
    enabled: !!boardId,
  })
}

export function useAddBoardMember(boardId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; role: BoardRole }) =>
      apiFetch<BoardMember>(`/boards/${boardId}/members`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'members'] }),
  })
}

export function useUpdateBoardMemberRole(boardId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: BoardRole }) =>
      apiFetch<BoardMember>(`/boards/${boardId}/members/${userId}`, { method: 'PATCH', body: { role } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'members'] }),
  })
}

export function useRemoveBoardMember(boardId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => apiFetch<void>(`/boards/${boardId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards', boardId, 'members'] }),
  })
}
