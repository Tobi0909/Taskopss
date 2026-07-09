import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'

export function useBoardRealtime(boardId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!boardId) return

    const socket = getSocket()
    socket.emit('board:join', boardId)

    const handleTaskChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
    socket.on('task:changed', handleTaskChanged)

    return () => {
      socket.off('task:changed', handleTaskChanged)
      socket.emit('board:leave', boardId)
    }
  }, [boardId, queryClient])
}
