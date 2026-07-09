import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from './api'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/socket.io',
      autoConnect: false,
      auth: (cb) => cb({ token: getAccessToken() }),
    })
  }
  return socket
}
