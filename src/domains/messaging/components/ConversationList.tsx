import type { Conversation } from '../types/message.types'
import type { AppUser } from '@/domains/users/types/user.types'

interface Props {
  conversations: Conversation[]
  users: AppUser[]
  currentUid: string
  onlineUids: Set<string>
  activeConvId: string | null
  onSelect: (conv: Conversation) => void
}

function formatTime(ms: number): string {
  if (!ms) return ''
  const diff = Date.now() - ms
  if (diff < 60_000) return 'ahora'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) {
    return new Date(ms).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }
  const d = new Date(ms)
  const today = new Date()
  if (d.getFullYear() === today.getFullYear()) {
    return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
  }
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="shrink-0 min-w-[18px] h-[18px] bg-brand-500 rounded-full
                     flex items-center justify-center text-[10px] font-bold text-white px-1">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export default function ConversationList({
  conversations, users, currentUid, onlineUids, activeConvId, onSelect,
}: Props) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Buscá un contacto arriba para iniciar una conversación
        </p>
      </div>
    )
  }

  return (
    <div>
      {conversations.map(conv => {
        const isActive = conv.id === activeConvId
        const unread = conv.unreadCounts?.[currentUid] ?? 0

        if (conv.type === 'direct') {
          const otherUid = conv.participants.find(p => p !== currentUid) ?? ''
          const other = users.find(u => u.uid === otherUid)
          const name = other?.displayName ?? 'Usuario'
          const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
          const isOnline = onlineUids.has(otherUid)

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left
                          transition-colors duration-100 relative
                          ${isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-9 bg-brand-500 rounded-r-full" />
              )}
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-500 to-slate-700
                                flex items-center justify-center text-sm font-semibold text-white">
                  {initials}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0c1220]
                                  ${isOnline ? 'bg-green-400' : 'bg-slate-600'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-sm font-medium truncate leading-snug
                                 ${isActive ? 'text-white' : unread > 0 ? 'text-white' : 'text-slate-200'}`}>
                    {name}
                  </p>
                  <span className="text-[10px] text-slate-600 shrink-0">
                    {formatTime(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-xs text-slate-500 truncate">
                    {isOnline ? 'En línea' : 'Desconectado'}
                  </p>
                  <UnreadBadge count={unread} />
                </div>
              </div>
            </button>
          )
        }

        // Room
        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left
                        transition-colors duration-100 relative
                        ${isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-9 bg-brand-500 rounded-r-full" />
            )}
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-600 to-violet-700
                            flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className={`text-sm font-medium truncate leading-snug
                               ${isActive ? 'text-white' : unread > 0 ? 'text-white' : 'text-slate-200'}`}>
                  {conv.name}
                </p>
                <span className="text-[10px] text-slate-600 shrink-0">
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <p className="text-xs text-slate-500 truncate">
                  {conv.participants.length} participantes
                </p>
                <UnreadBadge count={unread} />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
