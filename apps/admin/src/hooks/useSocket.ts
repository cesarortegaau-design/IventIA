import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (!socket || !socket.connected) {
    socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] })
  }
  return socket
}

export function useSocket() {
  const token  = useAuthStore(s => s.accessToken)
  const ref    = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return
    ref.current = getSocket(token)
    return () => { /* keep socket alive across route changes */ }
  }, [token])

  return ref.current ?? (token ? getSocket(token) : null)
}
