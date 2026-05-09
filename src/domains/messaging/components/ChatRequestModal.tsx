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

  const remaining  = Math.ceil((request.expiresAt - Date.now()) / 1000)
  const progress   = (remaining / 45) * 100
  const gradient   = avatarGradient(request.fromName)
  const initials   = request.fromName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  // Color the countdown bar based on urgency
  const barColor = remaining > 20
    ? 'bg-brand-500'
    : remaining > 10
    ? 'bg-amber-500'
    : 'bg-red-500'

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto w-80 rounded-2xl border border-white/[0.10]
                      bg-[#0d1626] shadow-modal animate-slide-up overflow-hidden">

        {/* Countdown bar */}
        <div className="h-1 bg-white/[0.05]">
          <div
            className={`h-full ${barColor} transition-all duration-1000 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              Solicitud de chat
            </p>
            <span className={`text-xs tabular-nums font-mono font-semibold ${
              remaining > 20 ? 'text-slate-500' : remaining > 10 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {remaining}s
            </span>
          </div>

          {/* Sender info */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient}
                            flex items-center justify-center text-sm font-bold text-white shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm truncate">{request.fromName}</p>
              <p className="text-slate-400 text-xs mt-0.5">quiere chatear contigo</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500
                         text-white text-sm font-semibold transition-all duration-150
                         disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {busy ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Aceptar
                </>
              )}
            </button>
            <button
              onClick={handleDecline}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10]
                         text-slate-300 text-sm font-medium transition-all duration-150
                         disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>

          {/* Pending count */}
          {requests.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              <p className="text-[10px] text-slate-600">
                +{requests.length - 1} solicitud{requests.length > 2 ? 'es' : ''} más en espera
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
