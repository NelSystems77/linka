import { useState, useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { auth } from '@/core/config/firebase.config'
import { updateUserStatus } from '../services/users.service'
import type { UserStatus } from '../types/user.types'

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'http://localhost:3000'

export function usePresence(uid: string, currentStatus: UserStatus) {
  const [onlineUids, setOnlineUids] = useState<Set<string>>(new Set())
  const socketRef  = useRef<Socket | null>(null)
  const statusRef  = useRef<UserStatus>(currentStatus)
  statusRef.current = currentStatus

  useEffect(() => {
    if (!uid) return

    let socket: Socket

    auth.currentUser?.getIdToken().then(token => {
      socket = io(`${WS_URL}/ws`, {
        auth:          { token },
        reconnection:  true,
        transports:    ['websocket'],
      })
      socketRef.current = socket

      socket.on('connect', () => {
        // Only auto-set to available if user isn't manually set to busy
        if (statusRef.current !== 'busy') {
          updateUserStatus(uid, 'available').catch(() => {})
        }
      })

      socket.on('presence', (data: { uid: string; online: boolean }) => {
        setOnlineUids(prev => {
          const next = new Set(prev)
          if (data.online) next.add(data.uid)
          else next.delete(data.uid)
          return next
        })
      })

      socket.on('disconnect', () => {
        updateUserStatus(uid, 'offline').catch(() => {})
      })
    }).catch(() => {})

    return () => {
      socket?.disconnect()
      socketRef.current = null
      updateUserStatus(uid, 'offline').catch(() => {})
    }
  }, [uid])

  return { onlineUids, socket: socketRef }
}
