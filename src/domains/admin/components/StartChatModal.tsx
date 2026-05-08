import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppUser } from '@/domains/users/types/user.types'

interface Props {
  users:    AppUser[]
  onClose:  () => void
}

export default function StartChatModal({ users, onClose }: Props) {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const now = Date.now()
  const filtered = users
    .filter(u => !u.isBlocked && (u.expiresAt === null || u.expiresAt > now))
    .filter(u =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )

  function handleSelect(u: AppUser) {
    onClose()
    navigate('/chat', { state: { autoSelectUid: u.uid } })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-base">Iniciar chat</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.05]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por nombre o email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-surface border border-surface-border rounded-xl pl-9 pr-3 py-2 text-sm
                         text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
        </div>

        {/* User list */}
        <div className="overflow-y-auto max-h-72 px-2 pb-3">
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">Sin usuarios activos.</p>
          )}
          {filtered.map(u => (
            <button
              key={u.uid}
              onClick={() => handleSelect(u)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         hover:bg-white/[0.05] transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center
                              text-xs font-bold text-white shrink-0">
                {u.displayName[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{u.displayName}</p>
                <p className="text-xs text-slate-500 truncate">{u.email}</p>
              </div>
              <svg className="w-4 h-4 text-slate-700 group-hover:text-brand-400 transition-colors shrink-0"
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-surface-border">
          <p className="text-xs text-slate-600">{filtered.length} usuario{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  )
}
