import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useAuthStore } from '@/domains/auth/store/auth.store'
import { signOut } from '@/domains/auth/services/auth.service'
import { useUsers } from '@/domains/users/hooks/useUsers'
import { usePresence } from '@/domains/users/hooks/usePresence'
import { useChatRequests } from '@/domains/messaging/hooks/useChatRequests'
import { useConversations } from '@/domains/messaging/hooks/useConversations'
import { updateUserStatus } from '@/domains/users/services/users.service'
import {
  sendChatRequest,
  subscribeToSentRequest,
  expireChatRequest,
} from '@/domains/messaging/services/chatRequest.service'
import {
  getOrCreateConversation,
  markConversationRead,
} from '@/domains/messaging/services/messaging.service'
import StatusSelector from '@/domains/users/components/StatusSelector'
import ChatWindow from '@/domains/messaging/components/ChatWindow'
import RoomWindow from '@/domains/messaging/components/RoomWindow'
import ChatRequestModal from '@/domains/messaging/components/ChatRequestModal'
import CreateRoomModal from '@/domains/messaging/components/CreateRoomModal'
import ConversationList from '@/domains/messaging/components/ConversationList'
import UserList from '@/domains/users/components/UserList'
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

export default function ChatPage() {
  const { user }  = useAuth()
  const { isAdmin } = useAuth()
  const setUser   = useAuthStore(s => s.setUser)
  const location  = useLocation()
  const navigate  = useNavigate()
  const [ownStatus, setOwnStatus] = useState<UserStatus>(user?.status ?? 'available')

  const { onlineUids, socketConnected } = usePresence(user?.uid ?? '', ownStatus)
  const { incomingRequests } = useChatRequests(user?.uid ?? '')
  const { conversations, loading: convsLoading } = useConversations(user?.uid ?? '')
  const { users } = useUsers(user?.uid ?? '')

  const [view, setView]               = useState<ActiveView>({ kind: 'empty' })
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [search, setSearch]           = useState('')
  const [pendingReq, setPendingReq]   = useState<PendingRequest | null>(null)
  const [reqFeedback, setReqFeedback] = useState<string>('')
  const [loadingConv, setLoadingConv] = useState(false)
  const [showRoomModal, setShowRoomModal] = useState(false)

  function openView(v: ActiveView) {
    setView(v)
    if (v.kind === 'empty') return
    setMobileChatOpen(true)
    if (!user) return
    if (v.kind === 'direct') {
      markConversationRead(v.conversationId, user.uid).catch(() => {})
    } else {
      markConversationRead(v.room.id, user.uid).catch(() => {})
    }
  }

  function handleMobileBack() {
    setMobileChatOpen(false)
    setView({ kind: 'empty' })
  }

  // Auto-reset unread count when conversation is active and new messages arrive
  useEffect(() => {
    if (!user || view.kind === 'empty') return
    const convId = view.kind === 'direct' ? view.conversationId : view.room.id
    const conv = conversations.find(c => c.id === convId)
    if (conv && (conv.unreadCounts?.[user.uid] ?? 0) > 0) {
      markConversationRead(convId, user.uid).catch(() => {})
    }
  }, [conversations, view, user])

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
          openView({ kind: 'direct', conversationId: convId, recipient: pendingReq.target })
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

  // Open a conversation from the inbox list
  const handleSelectConversation = useCallback((conv: Conversation) => {
    if (conv.type === 'room') {
      openView({ kind: 'room', room: conv })
    } else {
      const otherUid = conv.participants.find(p => p !== user!.uid) ?? ''
      const other = users.find(u => u.uid === otherUid)
      if (!other) return
      openView({ kind: 'direct', conversationId: conv.id, recipient: other })
    }
  }, [user, users, conversations])

  // Select a contact from search results to start or resume a conversation
  const handleSelectUser = useCallback(async (contact: AppUser) => {
    if (!user) return
    if (view.kind === 'direct' && view.recipient.uid === contact.uid) {
      setSearch('')
      return
    }

    // Resume existing conversation without a new chat request
    const sorted = [user.uid, contact.uid].sort()
    const existing = conversations.find(
      c => c.type === 'direct' &&
      c.participants.length === 2 &&
      c.participants[0] === sorted[0] &&
      c.participants[1] === sorted[1]
    )
    if (existing) {
      openView({ kind: 'direct', conversationId: existing.id, recipient: contact })
      setSearch('')
      return
    }

    // New conversation — requires chat request (target must be online)
    const effectiveStatus = onlineUids.has(contact.uid)
      ? (contact.status === 'busy' ? 'busy' : 'available')
      : 'offline'

    if (effectiveStatus === 'offline') {
      setReqFeedback(`${contact.displayName} está desconectado`)
      return
    }

    try {
      const requestId = await sendChatRequest(user.uid, user.displayName, contact.uid)
      setPendingReq({ requestId, target: contact })
      setSearch('')
    } catch {
      setReqFeedback('No se pudo enviar la solicitud')
    }
  }, [user, view, onlineUids, conversations])

  // Auto-initiate chat when arriving from the admin panel
  const autoSelectedRef = useRef(false)
  useEffect(() => {
    const autoSelectUid = (location.state as { autoSelectUid?: string } | null)?.autoSelectUid
    if (!autoSelectUid || autoSelectedRef.current || !socketConnected || users.length === 0) return
    const target = users.find(u => u.uid === autoSelectUid)
    if (!target) return
    autoSelectedRef.current = true
    window.history.replaceState({}, '')
    handleSelectUser(target)
  }, [location.state, socketConnected, users, handleSelectUser])

  const handleRequestAccepted = useCallback(async (conversationId: string, fromUid: string) => {
    const sender = users.find(u => u.uid === fromUid)
    if (!sender) return
    openView({ kind: 'direct', conversationId, recipient: sender })
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

  const activeConvId =
    view.kind === 'direct' ? view.conversationId :
    view.kind === 'room'   ? view.room.id :
    null

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCounts?.[user.uid] ?? 0), 0
  )

  return (
    <div className="h-dvh flex bg-surface overflow-hidden">

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
            const room = conversations.find(c => c.id === roomId)
            if (room) openView({ kind: 'room', room })
            setShowRoomModal(false)
          }}
          onClose={() => setShowRoomModal(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`${mobileChatOpen ? 'hidden' : 'flex'} md:flex flex-col
                    w-full md:w-[320px] shrink-0 border-r border-white/[0.05]`}
        style={{ background: '#0c1220' }}
      >

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
              placeholder="Buscar o nueva conversación…"
              className="w-full bg-white/[0.05] border border-white/[0.06] rounded-xl
                         pl-9 pr-3 py-2 text-sm text-slate-300 placeholder-slate-600
                         focus:outline-none focus:ring-1 focus:ring-brand-500/30
                         focus:border-brand-500/20 transition-all"
            />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {search.trim() ? (
            /* ── Search mode: find contacts to start a new conversation ── */
            <>
              <div className="px-4 pt-2 pb-1">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                  Nueva conversación
                </p>
              </div>
              <UserList
                currentUid={user.uid}
                onlineUids={onlineUids}
                selectedUid={null}
                filter={search}
                pendingUid={pendingReq?.target.uid ?? null}
                onSelect={handleSelectUser}
              />
            </>
          ) : (
            /* ── Inbox mode: list of active conversations ── */
            <>
              <div className="px-4 pt-2 pb-1 flex items-center justify-between">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">
                  Mensajes
                </p>
                {totalUnread > 0 && (
                  <span className="text-[10px] font-bold text-brand-400">
                    {totalUnread} sin leer
                  </span>
                )}
              </div>
              {convsLoading ? (
                <div className="px-2 py-2 space-y-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-11 h-11 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded-full bg-white/[0.06] animate-pulse w-3/4" />
                        <div className="h-2.5 rounded-full bg-white/[0.04] animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ConversationList
                  conversations={conversations}
                  users={users}
                  currentUid={user.uid}
                  onlineUids={onlineUids}
                  activeConvId={activeConvId}
                  onSelect={handleSelectConversation}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.04] shrink-0 space-y-2">
          {/* Dashboard button — visible only for admin / super_admin */}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center justify-center gap-2 text-xs px-3 py-2
                         rounded-xl border border-white/[0.07] text-slate-400
                         hover:text-white hover:bg-white/[0.05] transition-all duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Panel de administración
            </button>
          )}
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
            <p className="text-[10px] text-slate-700 tracking-wide">
              E2EE · Linka by NelSystems
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <main
        className={`${mobileChatOpen ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-surface relative`}
      >

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
            onBack={handleMobileBack}
          />
        ) : view.kind === 'room' ? (
          <RoomWindow
            room={view.room}
            currentUser={user}
            onExit={() => { setMobileChatOpen(false); setView({ kind: 'empty' }) }}
            onBack={handleMobileBack}
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
              Seleccioná una conversación
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
            {/* Back to dashboard — visible only for admin / super_admin */}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="mt-5 w-full flex items-center justify-center gap-2 text-xs px-4 py-2.5
                           rounded-xl border border-white/[0.08] text-slate-400
                           hover:text-white hover:bg-white/[0.05] transition-all duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Volver al panel de administración
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
