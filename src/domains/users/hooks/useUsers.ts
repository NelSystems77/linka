import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { firestore } from '@/core/config/firebase.config'
import type { AppUser } from '../types/user.types'

export function useUsers(currentUid: string) {
  const [users, setUsers]     = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(
      collection(firestore, 'users'),
      where('isBlocked', '==', false)
    )

    const unsub = onSnapshot(q, snap => {
      const now = Date.now()
      const list = snap.docs
        .map(d => d.data() as AppUser)
        .filter(u => u.uid !== currentUid)                         // exclude self
        .filter(u => u.expiresAt === null || u.expiresAt > now)    // exclude expired
        .sort((a, b) => a.displayName.localeCompare(b.displayName))

      setUsers(list)
      setLoading(false)
    })

    return unsub
  }, [currentUid])

  return { users, loading }
}
