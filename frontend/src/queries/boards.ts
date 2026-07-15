import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Board, BoardColumn, BoardWithColumns } from '@/types/api'

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
  return {
    board: boardQuery.data,
    isLoading: boardsQuery.isLoading || boardQuery.isLoading,
    isError: boardsQuery.isError || boardQuery.isError,
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
