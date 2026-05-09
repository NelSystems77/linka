import { useEffect, useRef } from 'react'
import { useMessages } from '../hooks/useMessages'
import { useFileUpload } from '@/domains/files/hooks/useFileUpload'
import { getPublicKey } from '@/domains/users/services/users.service'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import type { AppUser } from '@/domains/users/types/user.types'

interface Props {
  conversationId: string
  currentUser: AppUser
  recipient: AppUser
  onBack?: () => void
}

const AVATAR_GRADIENTS = [
  'from-violet-600 to-indigo-700',
  'from-blue-600 to-cyan-700',
  'from-emerald-600 to-teal-700',
  'from-rose-600 to-pink-700',
  'from-amber-600 to-orange-700',
  'from-fuchsia-600 to-purple-700',
  'from-sky-600 to-blue-700',
  'from-green-600 to-emerald-700',
]

function avatarGradient(name: string): string {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]!
}

export default function ChatWindow({ conversationId, currentUser, recipient, onBack }: Props) {
  const { messages, loading, send } = useMessages(conversationId, currentUser.uid, currentUser.plan)
  const { upload, download, uploading, downloading } = useFileUpload()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
  }, [messages.length])

  async function handleSendText(text: string) {
    await send({
      senderId:    currentUser.uid,
      recipientId: recipient.uid,
      plaintext:   text,
      type:        'text',
    })
  }

  async function handleSendFile(file: File) {
    const [senderKey, recipientKey] = await Promise.all([
      getPublicKey(currentUser.uid),
      getPublicKey(recipient.uid),
    ])
    if (!senderKey || !recipientKey) {
      alert('No se pudo obtener la clave pública. Intenta más tarde.')
      return
    }

    const participants = [
      { uid: currentUser.uid, publicKeySpki: senderKey },
      { uid: recipient.uid,   publicKeySpki: recipientKey },
    ]

    const fileId = await upload(file, conversationId, participants, currentUser.plan)
    if (!fileId) return

    await send({
      senderId:    currentUser.uid,
      recipientId: recipient.uid,
      plaintext:   `${file.type}|${file.name}`,
      type:        'file',
      fileRef:     fileId,
    })
  }

  const gradient = avatarGradient(recipient.displayName)
  const initial  = recipient.displayName[0]?.toUpperCase() ?? '?'

  // Group messages by date for date separators
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

      {/* ── Chat header ──────────────────────────────────────────────── */}
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

        {/* Recipient avatar */}
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient}
                        flex items-center justify-center text-sm font-semibold text-white shrink-0`}>
          {initial}
        </div>

        {/* Recipient info */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-snug">{recipient.displayName}</p>
          <p className="text-xs text-slate-500 truncate">{recipient.email}</p>
        </div>

        {/* E2EE badge */}
        <div className="flex items-center gap-1.5 bg-green-500/[0.08] border border-green-500/[0.15]
                        rounded-full px-2.5 py-1 shrink-0">
          <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-[10px] text-green-400 font-medium tracking-wide hidden sm:inline">E2EE</span>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 px-8">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient}
                            flex items-center justify-center text-xl font-bold text-white`}>
              {initial}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white mb-1">{recipient.displayName}</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Este es el inicio de tu conversación cifrada.<br />
                Di hola para comenzar 👋
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1]
              const showDateSep = !prevMsg ||
                new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString()

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
                    message={msg}
                    isMine={msg.senderId === currentUser.uid}
                    onDownloadFile={fileId => download(fileId, currentUser.uid)}
                    downloadingFileId={downloading}
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
        onSendFile={handleSendFile}
        uploading={uploading}
      />
    </div>
  )
}
