import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { useMessages } from '../hooks/useMessages'
import { useUsers } from '@/domains/users/hooks/useUsers'
import { leaveRoom, dissolveRoom } from '../services/room.service'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import type { AppUser } from '@/domains/users/types/user.types'
import type { Conversation } from '../types/message.types'

interface Props {
  room: Conversation
  currentUser: AppUser
  onExit: () => void
  onBack?: () => void
}

export default function RoomWindow({ room, currentUser, onExit, onBack }: Props) {
  const { messages, loading, sendRoom } = useMessages(room.id, currentUser.uid, currentUser.plan)
  const { users } = useUsers(currentUser.uid)
  const [showMembers, setShowMembers] = useState(false)
  const [confirming, setConfirming]   = useState<'leave' | 'dissolve' | null>(null)
  const [busy, setBusy]               = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
  }, [messages.length])

  async function handleSendText(text: string) {
    await sendRoom({
      senderId:        currentUser.uid,
      participantUids: room.participants,
      plaintext:       text,
      type:            'text',
    })
  }

  async function handleLeave() {
    if (busy) return
    setBusy(true)
    try {
      await leaveRoom(room.id, currentUser.uid, currentUser.displayName, currentUser.plan)
      onExit()
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  async function handleDissolve() {
    if (busy) return
    setBusy(true)
    try {
      await dissolveRoom(room.id)
      onExit()
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const isCreator        = room.createdBy === currentUser.uid
  const participantCount = room.participants.length

  // Resolve display names for members panel
  function getMemberName(uid: string): string {
    if (uid === currentUser.uid) return `${currentUser.displayName} (tú)`
    return users.find(u => u.uid === uid)?.displayName ?? uid.slice(0, 8) + '…'
  }

  // Date separators
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  function getDateLabel(ts: number): string {
    const d = new Date(ts)
    if (d.toDateString() === today.toDateString()) return 'Hoy'
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Room header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 md:px-5 py-3 border-b border-white/[0.05] shrink-0"
           style={{ background: '#0d1321' }}>

        {/* Back button — mobile only */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden shrink-0 w-8 h-8 flex items-center justify-center rounded-full
                       text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Room icon */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-600 to-violet-700
                        flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        {/* Room info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-snug truncate">{room.name}</p>
          <button
            onClick={() => setShowMembers(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            {participantCount} participante{participantCount !== 1 ? 's' : ''}
            <svg className={`w-3 h-3 transition-transform duration-150 ${showMembers ? 'rotate-180' : ''}`}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* E2EE badge */}
          <div className="flex items-center gap-1.5 bg-green-500/[0.08] border border-green-500/[0.15]
                          rounded-full px-2.5 py-1">
            <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-[10px] text-green-400 font-medium tracking-wide hidden sm:inline">E2EE</span>
          </div>

          {/* Leave / Dissolve */}
          {isCreator ? (
            <button
              onClick={() => setConfirming('dissolve')}
              title="Disolver sala"
              className="ml-1 w-8 h-8 flex items-center justify-center rounded-full
                         text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setConfirming('leave')}
              title="Salir de la sala"
              className="ml-1 w-8 h-8 flex items-center justify-center rounded-full
                         text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Members panel ────────────────────────────────────────────── */}
      {showMembers && (
        <div className="shrink-0 border-b border-white/[0.05] px-4 py-3 bg-[#0a1020] animate-fade-in">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">
            Participantes
          </p>
          <div className="flex gap-2 flex-wrap">
            {room.participants.map(uid => {
              const name = getMemberName(uid)
              const isMe = uid === currentUser.uid
              const initial = name[0]?.toUpperCase() ?? '?'
              return (
                <div key={uid}
                  className={clsx(
                    'flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 border',
                    isMe
                      ? 'bg-brand-500/10 border-brand-500/20 text-brand-300'
                      : 'bg-white/[0.04] border-white/[0.06] text-slate-400'
                  )}
                >
                  <span className={clsx(
                    'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold',
                    isMe ? 'bg-brand-500/30 text-brand-300' : 'bg-white/[0.08] text-slate-400'
                  )}>
                    {initial}
                  </span>
                  {name}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Confirm dialog ───────────────────────────────────────────── */}
      {confirming && (
        <div className="shrink-0 mx-4 my-2 rounded-xl border border-white/[0.08]
                        bg-[#0d1626] px-4 py-3 flex items-center gap-3 animate-fade-in">
          <div className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
            confirming === 'dissolve' ? 'bg-red-500/10' : 'bg-amber-500/10'
          )}>
            <svg className={clsx('w-4 h-4', confirming === 'dissolve' ? 'text-red-400' : 'text-amber-400')}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d={confirming === 'dissolve'
                  ? 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                  : 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                }
              />
            </svg>
          </div>
          <p className="text-sm text-slate-300 flex-1">
            {confirming === 'leave'
              ? '¿Salir de la sala?'
              : '¿Disolver la sala? Todos los mensajes se eliminarán.'}
          </p>
          <button
            onClick={confirming === 'leave' ? handleLeave : handleDissolve}
            disabled={busy}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50',
              confirming === 'dissolve' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'
            )}
          >
            {busy ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : confirming === 'leave' ? 'Salir' : 'Disolver'}
          </button>
          <button
            onClick={() => setConfirming(null)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-1"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 px-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-700
                            flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white mb-1">{room.name}</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                La sala está lista con {participantCount} participantes.<br />
                ¡Di algo para comenzar! 🚀
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1]
              const showDateSep = !prevMsg ||
                new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString()

              if (msg.type === 'system') {
                return (
                  <div key={msg.id}>
                    {showDateSep && msg.createdAt && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 h-px bg-white/[0.05]" />
                        <span className="text-[10px] text-slate-600 font-medium px-2">
                          {getDateLabel(msg.createdAt)}
                        </span>
                        <div className="flex-1 h-px bg-white/[0.05]" />
                      </div>
                    )}
                    <div className="flex justify-center my-1">
                      <span className="text-[11px] text-slate-600 bg-white/[0.03] border border-white/[0.05]
                                       rounded-full px-3 py-1">
                        {msg.systemContent}
                      </span>
                    </div>
                  </div>
                )
              }

              return (
                <div key={msg.id}>
                  {showDateSep && msg.createdAt && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 h-px bg-white/[0.05]" />
                      <span className="text-[10px] text-slate-600 font-medium px-2">
                        {getDateLabel(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-white/[0.05]" />
                    </div>
                  )}
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isMine={msg.senderId === currentUser.uid}
                    senderName={
                      msg.senderId !== currentUser.uid
                        ? (users.find(u => u.uid === msg.senderId)?.displayName ?? undefined)
                        : undefined
                    }
                  />
                </div>
              )
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────── */}
      <MessageInput
        onSendText={handleSendText}
        onSendFile={() => Promise.resolve()}
        uploading={false}
      />
    </div>
  )
}
