import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { firestore } from '@/core/config/firebase.config'
import type { Conversation } from '../types/message.types'

export function useRooms(uid: string) {
  const [rooms, setRooms]     = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    const q = query(
      collection(firestore, 'conversations'),
      where('type', '==', 'room'),
      where('participants', 'array-contains', uid)
    )
    const unsub = onSnapshot(q, snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)))
      setLoading(false)
    })
    return unsub
  }, [uid])

  return { rooms, loading }
}
