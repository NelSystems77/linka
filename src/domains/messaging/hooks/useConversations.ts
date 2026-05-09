import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { firestore } from '@/core/config/firebase.config'
import type { Conversation } from '../types/message.types'

export function useConversations(uid: string) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const q = query(
      collection(firestore, 'conversations'),
      where('participants', 'array-contains', uid)
    )
    const unsub = onSnapshot(q, snap => {
      const convs = snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() ?? 0,
          lastMessageAt: data.lastMessageAt?.toMillis?.() ?? 0,
        } as Conversation
      })
      convs.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
      setConversations(convs)
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { conversations, loading }
}
