import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { ALLOWED_MIME_TYPES } from '@/domains/files/types/file.types'

interface Props {
  onSendText: (text: string) => Promise<void>
  onSendFile: (file: File) => Promise<void>
  uploading: boolean
  disabled?: boolean
}

export default function MessageInput({ onSendText, onSendFile, uploading, disabled }: Props) {
  const [text, setText]       = useState('')
  const [sending, setSending] = useState(false)
  const fileInputRef          = useRef<HTMLInputElement>(null)
  const textareaRef           = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [text])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onSendText(trimmed)
      setText('')
      // Reset height after clearing
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await onSendFile(file)
    e.target.value = ''
  }

  const isBlocked = disabled || sending || uploading
  const canSend   = !isBlocked && text.trim().length > 0

  return (
    <div className="shrink-0 border-t border-white/[0.05] px-3 sm:px-4 py-3"
         style={{ background: '#0d1321' }}>

      <div className="flex items-end gap-2">

        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBlocked}
          title="Adjuntar archivo"
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full
                     text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]
                     disabled:opacity-40 transition-all duration-150 mb-0.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBlocked}
          placeholder={
            uploading
              ? 'Subiendo archivo…'
              : sending
              ? 'Enviando…'
              : 'Escribe un mensaje… (Enter para enviar)'
          }
          rows={1}
          className="flex-1 bg-white/[0.05] border border-white/[0.07] rounded-2xl
                     px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 resize-none
                     focus:outline-none focus:ring-1 focus:ring-brand-500/40
                     focus:border-brand-500/30 transition-all disabled:opacity-50
                     leading-relaxed overflow-hidden"
          style={{ maxHeight: '120px' }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          title="Enviar (Enter)"
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full
                     bg-brand-600 hover:bg-brand-500
                     disabled:opacity-30 disabled:bg-slate-700 disabled:cursor-not-allowed
                     text-white transition-all duration-150 shadow-sm mb-0.5
                     active:scale-95"
        >
          {sending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 translate-x-px" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>

      {/* E2EE footer + hint */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <svg className="w-3 h-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-[10px] text-slate-700 tracking-wide">
            Cifrado extremo a extremo
          </p>
        </div>
        <p className="text-[10px] text-slate-700">
          Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}
