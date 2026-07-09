import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSocket } from '@/lib/socket'
import { useAuth } from '@/features/auth/AuthContext'

export function useRealtimeConnection() {
  const { status } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (status !== 'authenticated') return

    const socket = getSocket()
    socket.connect()

    const handleNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
    socket.on('notification:new', handleNotification)

    return () => {
      socket.off('notification:new', handleNotification)
      socket.disconnect()
    }
  }, [status, queryClient])
}
