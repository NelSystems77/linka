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

export default function ChatWindow({ conversationId, currentUser, recipient }: Props) {
  const { messages, loading, send } = useMessages(conversationId, currentUser.uid, currentUser.plan)
  const { upload, download, uploading, downloading } = useFileUpload()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  return (
    <div className="flex flex-col h-full">

      {/* ── Chat header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05] shrink-0"
           style={{ background: '#0d1321' }}>

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
                        rounded-full px-3 py-1 shrink-0">
          <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-[10px] text-green-400 font-medium tracking-wide">E2EE</span>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1.5">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">Di hola para comenzar</p>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === currentUser.uid}
              onDownloadFile={fileId => download(fileId, currentUser.uid)}
              downloadingFileId={downloading}
            />
          ))
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
