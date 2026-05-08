import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useAuthStore } from '@/domains/auth/store/auth.store'
import { signOut } from '@/domains/auth/services/auth.service'
import { useUsers } from '@/domains/users/hooks/useUsers'
import { usePresence } from '@/domains/users/hooks/usePresence'
import { useChatRequests } from '@/domains/messaging/hooks/useChatRequests'
import { useRooms } from '@/domains/messaging/hooks/useRooms'
import { updateUserStatus } from '@/domains/users/services/users.service'
import {
  sendChatRequest,
  subscribeToSentRequest,
  expireChatRequest,
} from '@/domains/messaging/services/chatRequest.service'
import { getOrCreateConversation } from '@/domains/messaging/services/messaging.service'
import UserList from '@/domains/users/components/UserList'
import UserCard from '@/domains/users/components/UserCard'
import StatusSelector from '@/domains/users/components/StatusSelector'
import ChatWindow from '@/domains/messaging/components/ChatWindow'
import RoomWindow from '@/domains/messaging/components/RoomWindow'
import ChatRequestModal from '@/domains/messaging/components/ChatRequestModal'
import CreateRoomModal from '@/domains/messaging/components/CreateRoomModal'
import type { AppUser, UserStatus } from '@/domains/users/types/user.types'
import type { Conversation } from '@/domains/messaging/types/message.types'

type ActiveView =
  | { kind: 'direct'; conversationId: string; recipient: AppUser }
  | { kind: 'room';   room: Conversation }
  | { kind: 'empty' }

interface PendingRequest {
  requestId: string
  target: AppUser
}

const AVATAR_GRADIENTS = [
  'from-violet-600 to-indigo-700', 'from-blue-600 to-cyan-700',
  'from-emerald-600 to-teal-700',  'from-rose-600 to-pink-700',
  'from-amber-600 to-orange-700',  'from-fuchsia-600 to-purple-700',
]
function avatarGradient(name: string) {
  return AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length]!
}

export default function ChatPage() {
  const { user }  = useAuth()
  const setUser   = useAuthStore(s => s.setUser)
  const [ownStatus, setOwnStatus] = useState<UserStatus>(user?.status ?? 'available')

  const { onlineUids }     = usePresence(user?.uid ?? '', ownStatus)
  const { incomingRequests } = useChatRequests(user?.uid ?? '')
  const { rooms }          = useRooms(user?.uid ?? '')
  const { users }          = useUsers(user?.uid ?? '')

  const [view, setView]               = useState<ActiveView>({ kind: 'empty' })
  const [search, setSearch]           = useState('')
  const [pendingReq, setPendingReq]   = useState<PendingRequest | null>(null)
  const [reqFeedback, setReqFeedback] = useState<string>('')
  const [loadingConv, setLoadingConv] = useState(false)
  const [showRoomModal, setShowRoomModal] = useState(false)

  // Feedback toast auto-dismiss
  useEffect(() => {
    if (!reqFeedback) return
    const id = setTimeout(() => setReqFeedback(''), 4000)
    return () => clearTimeout(id)
  }, [reqFeedback])

  // Watch the pending sent request for a response
  const unsubPendingRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    if (!pendingReq) return

    // Auto-expire after 45 s
    const expireTimer = setTimeout(async () => {
      await expireChatRequest(pendingReq.requestId).catch(() => {})
      setPendingReq(null)
      setReqFeedback(`${pendingReq.target.displayName} no respondió a tiempo`)
    }, 45_000)

    const unsub = subscribeToSentRequest(pendingReq.requestId, async req => {
      if (!req || req.status === 'pending') return
      clearTimeout(expireTimer)
      unsubPendingRef.current?.()

      if (req.status === 'accepted') {
        try {
          setLoadingConv(true)
          const convId = await getOrCreateConversation(user!.uid, pendingReq.target.uid)
          setView({ kind: 'direct', conversationId: convId, recipient: pendingReq.target })
        } finally {
          setLoadingConv(false)
        }
      } else {
        setReqFeedback(`${pendingReq.target.displayName} no está disponible en este momento`)
      }
      setPendingReq(null)
    })

    unsubPendingRef.current = unsub
    return () => { clearTimeout(expireTimer); unsub() }
  }, [pendingReq, user])

  const handleSelectUser = useCallback(async (contact: AppUser) => {
    if (!user) return

    // If already chatting with this user, just switch view
    if (view.kind === 'direct' && view.recipient.uid === contact.uid) return

    const effectiveStatus = onlineUids.has(contact.uid)
      ? (contact.status === 'busy' ? 'busy' : 'available')
      : 'offline'

    if (effectiveStatus === 'offline') {
      setReqFeedback(`${contact.displayName} está desconectado`)
      return
    }

    // Send chat request
    try {
      const requestId = await sendChatRequest(user.uid, user.displayName, contact.uid)
      setPendingReq({ requestId, target: contact })
    } catch {
      setReqFeedback('No se pudo enviar la solicitud')
    }
  }, [user, view, onlineUids])

  const handleRequestAccepted = useCallback(async (conversationId: string, fromUid: string) => {
    const sender = users.find(u => u.uid === fromUid)
    if (!sender) return
    setView({ kind: 'direct', conversationId, recipient: sender })
  }, [users])

  function handleStatusChange(status: UserStatus) {
    setOwnStatus(status)
    if (user) updateUserStatus(user.uid, status).catch(() => {})
  }

  async function handleSignOut() {
    if (user) await updateUserStatus(user.uid, 'offline').catch(() => {})
    await signOut()
    setUser(null)
  }

  if (!user) return null

  const initials = user.displayName
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const activeRoomId    = view.kind === 'room'   ? view.room.id            : null
  const activeRecipUid  = view.kind === 'direct' ? view.recipient.uid      : null

  return (
    <div className="h-screen flex bg-surface overflow-hidden">

      {/* ── Incoming request popup ──────────────────────────────────── */}
      {incomingRequests.length > 0 && (
        <ChatRequestModal
          requests={incomingRequests}
          currentUid={user.uid}
          onAccepted={handleRequestAccepted}
        />
      )}

      {/* ── Create room modal ───────────────────────────────────────── */}
      {showRoomModal && (
        <CreateRoomModal
          currentUser={user}
          onCreated={roomId => {
            const room = rooms.find(r => r.id === roomId)
            if (room) setView({ kind: 'room', room })
            setShowRoomModal(false)
          }}
          onClose={() => setShowRoomModal(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-[320px] flex flex-col shrink-0 border-r border-white/[0.05]"
             style={{ background: '#0c1220' }}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.05] shrink-0"
             style={{ background: '#0d1321' }}>
          <div className="flex items-center gap-3">

            {/* Own avatar + status selector */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center
                              text-sm font-bold text-white">
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusSelector current={ownStatus} onChange={handleStatusChange} />
              </div>
            </div>

            {/* Name + plan */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-snug">
                {user.displayName}
              </p>
              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-md font-medium mt-0.5 leading-none ${
                user.plan === 'full'
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                {user.plan === 'full' ? 'Full' : 'Free · 24h'}
              </span>
            </div>

            {/* New room button */}
            <button
              onClick={() => setShowRoomModal(true)}
              title="Nueva sala"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full
                         text-slate-600 hover:text-slate-300 hover:bg-white/[0.06]
                         transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm-4-6v2m0 0v2m0-2h2m-2 0H9" />
              </svg>
            </button>

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full
                         text-slate-600 hover:text-slate-300 hover:bg-white/[0.06]
                         transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar contacto…"
              className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl
                         pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-slate-600
                         focus:outline-none focus:ring-1 focus:ring-brand-500/30
                         focus:border-brand-500/20 transition-all"
            />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Active rooms section ── */}
          {rooms.length > 0 && (
            <>
              <div className="px-4 pt-2 pb-1">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                  Salas activas
                </p>
              </div>
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setView({ kind: 'room', room })}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left
                              transition-colors duration-100 relative
                              ${activeRoomId === room.id ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
                >
                  {activeRoomId === room.id && (
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
                    <p className={`text-sm font-medium truncate leading-snug
                                   ${activeRoomId === room.id ? 'text-white' : 'text-slate-200'}`}>
                      {room.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {room.participants.length} participantes
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* ── Contacts section ── */}
          <div className="px-4 pt-2 pb-1">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
              Contactos
            </p>
          </div>
          <UserList
            currentUid={user.uid}
            onlineUids={onlineUids}
            selectedUid={activeRecipUid}
            filter={search}
            pendingUid={pendingReq?.target.uid ?? null}
            onSelect={handleSelectUser}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.04] shrink-0">
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
            <p className="text-[10px] text-slate-700 tracking-wide">
              E2EE · Linka by NelSystems
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface relative">

        {/* Request feedback toast */}
        {reqFeedback && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40
                          bg-[#131c2e] border border-white/[0.08] rounded-xl
                          px-4 py-2.5 text-sm text-slate-300 shadow-xl animate-fade-in
                          flex items-center gap-2 max-w-xs text-center">
            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {reqFeedback}
          </div>
        )}

        {loadingConv ? (
          <div className="m-auto flex flex-col items-center gap-4">
            <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">Abriendo conversación…</p>
          </div>
        ) : view.kind === 'direct' ? (
          <ChatWindow
            conversationId={view.conversationId}
            currentUser={user}
            recipient={view.recipient}
          />
        ) : view.kind === 'room' ? (
          <RoomWindow
            room={view.room}
            currentUser={user}
            onExit={() => setView({ kind: 'empty' })}
          />
        ) : (
          /* ── Empty state ── */
          <div className="m-auto text-center px-8 max-w-xs animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-brand-gradient mx-auto mb-5
                            flex items-center justify-center shadow-brand-glow">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-base mb-2">
              Selecciona un contacto
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Tus mensajes están cifrados de extremo a extremo. Ni el servidor ni el administrador pueden leerlos.
            </p>
            {pendingReq && (
              <div className="mt-5 bg-brand-500/[0.08] border border-brand-500/15 rounded-xl px-4 py-3">
                <p className="text-brand-300 text-xs leading-relaxed animate-pulse">
                  Esperando respuesta de {pendingReq.target.displayName}…
                </p>
              </div>
            )}
            {user.plan === 'free' && !pendingReq && (
              <p className="text-amber-400/80 text-xs mt-5 bg-amber-500/[0.08] border border-amber-500/15
                            rounded-xl px-4 py-2.5 leading-relaxed">
                Plan Free: mensajes y archivos se eliminan a las 24 h.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
