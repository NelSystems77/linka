import { useUsers } from '../hooks/useUsers'
import UserCard from './UserCard'
import type { AppUser } from '../types/user.types'

interface Props {
  currentUid: string
  onlineUids: Set<string>
  selectedUid: string | null
  pendingUid?: string | null
  filter?: string
  onSelect: (user: AppUser) => void
}

export default function UserList({
  currentUid, onlineUids, selectedUid, pendingUid = null, filter = '', onSelect,
}: Props) {
  const { users, loading } = useUsers(currentUid)

  if (loading) {
    return (
      <div className="px-2 py-2 space-y-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="w-11 h-11 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded-full bg-white/[0.06] animate-pulse w-3/4" />
              <div className="h-2.5 rounded-full bg-white/[0.04] animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const filtered = filter.trim()
    ? users.filter(u => u.displayName.toLowerCase().includes(filter.toLowerCase()))
    : users

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-xs text-slate-500 text-center">
          {filter ? 'Sin resultados' : 'No hay contactos disponibles'}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto flex-1">
      {filtered.map(user => (
        <UserCard
          key={user.uid}
          user={user}
          isActive={user.uid === selectedUid}
          isOnline={onlineUids.has(user.uid)}
          isPending={user.uid === pendingUid}
          onClick={() => onSelect(user)}
        />
      ))}
    </div>
  )
}
