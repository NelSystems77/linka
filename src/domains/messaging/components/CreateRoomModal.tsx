import { useState } from 'react'
import { createRoom } from '../services/room.service'
import { useUsers } from '@/domains/users/hooks/useUsers'
import type { AppUser } from '@/domains/users/types/user.types'

interface Props {
  currentUser: AppUser
  onCreated: (roomId: string) => void
  onClose: () => void
}

const FREE_MAX_PARTICIPANTS = 5

export default function CreateRoomModal({ currentUser, onCreated, onClose }: Props) {
  const [name, setName]           = useState('')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<AppUser[]>([])
  const [creating, setCreating]   = useState(false)
  const [error, setError]         = useState('')

  const isFull = currentUser.plan === 'full'
  // Full plan gets suggestions from user list; free plan shows no list
  const { users } = useUsers(currentUser.uid)

  const maxSlots   = isFull ? Infinity : FREE_MAX_PARTICIPANTS - 1  // -1 for self
  const atLimit    = selected.length >= maxSlots
  const totalCount = selected.length + 1  // +1 for creator

  const filteredUsers = isFull
    ? users.filter(u =>
        u.displayName.toLowerCase().includes(search.toLowerCase()) &&
        !selected.some(s => s.uid === u.uid)
      )
    : []

  function toggle(user: AppUser) {
    if (selected.some(s => s.uid === user.uid)) {
      setSelected(prev => prev.filter(s => s.uid !== user.uid))
    } else {
      if (atLimit) return
      setSelected(prev => [...prev, user])
    }
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Ingresa un nombre para la sala'); return }
    if (selected.length === 0) { setError('Agrega al menos un participante'); return }
    setError('')
    setCreating(true)
    try {
      const participants = [currentUser.uid, ...selected.map(u => u.uid)]
      const roomId = await createRoom(currentUser.uid, name.trim(), participants)
      onCreated(roomId)
    } catch {
      setError('No se pudo crear la sala, intenta de nuevo')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d1626] shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold text-base">Nueva sala de chat</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Room name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Nombre de la sala</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              placeholder="Ej. Proyecto Alpha"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                         px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600
                         focus:outline-none focus:ring-1 focus:ring-brand-500/30
                         focus:border-brand-500/20 transition-all"
            />
          </div>

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400 font-medium">Participantes</label>
              <span className="text-[10px] text-slate-600">
                {totalCount}/{isFull ? '∞' : FREE_MAX_PARTICIPANTS}
              </span>
            </div>

            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selected.map(u => (
                  <span
                    key={u.uid}
                    className="flex items-center gap-1 bg-brand-600/20 border border-brand-500/20
                               text-brand-300 text-xs rounded-full px-2.5 py-1"
                  >
                    {u.displayName.split(' ')[0]}
                    <button
                      onClick={() => toggle(u)}
                      className="ml-0.5 text-brand-400/60 hover:text-brand-300"
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            {isFull ? (
              <>
                <div className="relative mb-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar usuarios…"
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                               pl-8 pr-3 py-2 text-sm text-slate-300 placeholder-slate-600
                               focus:outline-none focus:ring-1 focus:ring-brand-500/30
                               focus:border-brand-500/20 transition-all"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-4">
                      {search ? 'Sin resultados' : 'Todos los usuarios ya están agregados'}
                    </p>
                  ) : (
                    filteredUsers.map(u => (
                      <button
                        key={u.uid}
                        onClick={() => toggle(u)}
                        disabled={atLimit && !selected.some(s => s.uid === u.uid)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left
                                   hover:bg-white/[0.04] transition-colors
                                   disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <div className="w-7 h-7 rounded-full bg-brand-600/30 flex items-center justify-center
                                        text-xs font-semibold text-brand-300 shrink-0">
                          {u.displayName[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-300 truncate">{u.displayName}</span>
                        <span className="ml-auto text-[10px] text-slate-600">{u.plan === 'full' ? 'Full' : 'Free'}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 bg-amber-500/[0.06] border border-amber-500/10
                            rounded-xl px-3 py-2.5 leading-relaxed">
                Plan Free: máximo {FREE_MAX_PARTICIPANTS} participantes por sala.<br />
                Actualiza a Full para agregar usuarios con sugerencias.
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08]
                       text-slate-400 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || selected.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500
                       text-white text-sm font-semibold transition-colors
                       disabled:opacity-50 disabled:pointer-events-none"
          >
            {creating ? 'Creando…' : 'Crear sala'}
          </button>
        </div>
      </div>
    </div>
  )
}
