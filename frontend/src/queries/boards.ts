import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { Board, BoardWithColumns } from '@/types/api'

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
