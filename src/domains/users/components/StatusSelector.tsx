import { useState, useRef, useEffect } from 'react'
import type { UserStatus } from '../types/user.types'

interface Props {
  current: UserStatus
  onChange: (status: UserStatus) => void
}

const OPTIONS: { value: UserStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Disponible',  color: 'bg-green-400' },
  { value: 'busy',      label: 'Ocupado',      color: 'bg-amber-400' },
  { value: 'offline',   label: 'Invisible',    color: 'bg-slate-500' },
]

function dotColor(status: UserStatus): string {
  if (status === 'available') return 'bg-green-400'
  if (status === 'busy')      return 'bg-amber-400'
  return 'bg-slate-500'
}

export default function StatusSelector({ current, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-4 h-4 rounded-full border-2 border-[#0d1321] focus:outline-none"
        title="Cambiar estado"
      >
        <span className={`block w-full h-full rounded-full ${dotColor(current)}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-5 z-50 w-40 rounded-xl border border-white/[0.08]
                        bg-[#131c2e] shadow-xl py-1 animate-fade-in">
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left
                         hover:bg-white/[0.06] transition-colors"
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.color}`} />
              <span className={`text-xs font-medium ${current === opt.value ? 'text-white' : 'text-slate-400'}`}>
                {opt.label}
              </span>
              {current === opt.value && (
                <svg className="w-3 h-3 text-brand-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
