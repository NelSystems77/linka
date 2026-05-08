import { useEffect, useState } from 'react'
import { respondToChatRequest } from '../services/chatRequest.service'
import { getOrCreateConversation } from '../services/messaging.service'
import type { ChatRequest } from '../types/chatRequest.types'

interface Props {
  requests: ChatRequest[]
  currentUid: string
  onAccepted: (conversationId: string, fromUid: string) => void
}

const AVATAR_GRADIENTS = [
  'from-violet-600 to-indigo-700',
  'from-blue-600 to-cyan-700',
  'from-emerald-600 to-teal-700',
  'from-rose-600 to-pink-700',
  'from-amber-600 to-orange-700',
  'from-fuchsia-600 to-purple-700',
]

function avatarGradient(name: string): string {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]!
}

export default function ChatRequestModal({ requests, currentUid, onAccepted }: Props) {
  const [busy, setBusy] = useState(false)
  const request = requests[0]  // show one at a time (oldest first)

  // Auto-expire: re-render every second to remove stale requests from UI
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [])

  if (!request || request.expiresAt < Date.now()) return null

  const remaining = Math.ceil((request.expiresAt - Date.now()) / 1000)
  const gradient  = avatarGradient(request.fromName)
  const initials  = request.fromName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  async function handleAccept() {
    if (busy) return
    setBusy(true)
    try {
      const convId = await getOrCreateConversation(currentUid, request.fromUid)
      await respondToChatRequest(request.id, 'accepted')
      onAccepted(convId, request.fromUid)
    } finally {
      setBusy(false)
    }
  }

  async function handleDecline() {
    if (busy) return
    setBusy(true)
    try {
      await respondToChatRequest(request.id, 'declined')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto w-80 rounded-2xl border border-white/[0.08]
                      bg-[#0d1626] shadow-2xl animate-fade-in overflow-hidden">

        {/* Countdown bar */}
        <div className="h-0.5 bg-white/[0.05]">
          <div
            className="h-full bg-brand-500 transition-all duration-1000"
            style={{ width: `${(remaining / 45) * 100}%` }}
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-semibold">
            Solicitud de chat
          </p>

          {/* Sender info */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient}
                            flex items-center justify-center text-sm font-bold text-white shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{request.fromName}</p>
              <p className="text-slate-400 text-xs mt-0.5">desea chatear contigo</p>
            </div>
            <span className="ml-auto text-xs text-slate-600 tabular-nums shrink-0">{remaining}s</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500
                         text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {busy ? '…' : 'Iniciar chat'}
            </button>
            <button
              onClick={handleDecline}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10]
                         text-slate-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              En otro momento
            </button>
          </div>

          {/* Pending count */}
          {requests.length > 1 && (
            <p className="text-center text-[10px] text-slate-600 mt-2.5">
              +{requests.length - 1} solicitud{requests.length > 2 ? 'es' : ''} más
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
