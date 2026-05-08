import { useState, useEffect } from 'react'
import { subscribeToIncomingRequests } from '../services/chatRequest.service'
import type { ChatRequest } from '../types/chatRequest.types'

export function useChatRequests(uid: string) {
  const [incomingRequests, setIncomingRequests] = useState<ChatRequest[]>([])

  useEffect(() => {
    if (!uid) return
    const unsub = subscribeToIncomingRequests(uid, setIncomingRequests)
    return unsub
  }, [uid])

  return { incomingRequests }
}
