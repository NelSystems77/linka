import { useState } from 'react'
import { addMonths, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AppUser, RenewalCycle } from '@/domains/users/types/user.types'

interface Props {
  user:       AppUser
  onClose:    () => void
  onConfirm:  (cycle: RenewalCycle) => Promise<void>
  submitting: boolean
}

const CYCLES: { months: RenewalCycle; label: string }[] = [
  { months: 3,  label: '3 meses'  },
  { months: 6,  label: '6 meses'  },
  { months: 9,  label: '9 meses'  },
  { months: 12, label: '1 año'    },
]

export default function RenewalModal({ user, onClose, onConfirm, submitting }: Props) {
  const [selected, setSelected] = useState<RenewalCycle>(3)
  const [error, setError]       = useState<string | null>(null)

  const baseDate   = user.expiresAt && user.expiresAt > Date.now()
    ? new Date(user.expiresAt)
    : new Date()
  const newExpiry  = addMonths(baseDate, selected)
  const isExpired  = user.expiresAt !== null && user.expiresAt <= Date.now()

  async function handleConfirm() {
    setError(null)
    try {
      await onConfirm(selected)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <div>
            <h2 className="text-lg font-bold text-white">Renovar acceso</h2>
            <p className="text-sm text-slate-400 mt-0.5">{user.displayName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Current status */}
          <div className="bg-surface rounded-xl p-4 border border-surface-border">
            <p className="text-xs text-slate-500 mb-1">Estado actual</p>
            {isExpired ? (
              <p className="text-amber-400 font-medium text-sm">⚠ Cuenta expirada</p>
            ) : user.isBlocked ? (
              <p className="text-red-400 font-medium text-sm">🚫 Cuenta bloqueada</p>
            ) : user.expiresAt ? (
              <p className="text-green-400 font-medium text-sm">
                Activa hasta: {format(new Date(user.expiresAt), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            ) : (
              <p className="text-green-400 font-medium text-sm">Sin expiración</p>
            )}
          </div>

          {/* Cycle selector */}
          <div>
            <p className="text-xs text-slate-400 mb-3">Selecciona el ciclo de renovación</p>
            <div className="grid grid-cols-2 gap-2">
              {CYCLES.map(({ months, label }) => (
                <button
                  key={months} type="button"
                  onClick={() => setSelected(months)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    selected === months
                      ? 'bg-brand-600/20 border-brand-500 text-white'
                      : 'bg-surface border-surface-border text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-[11px] opacity-60 mt-0.5">
                    Hasta: {format(addMonths(baseDate, months), "MMM yyyy", { locale: es })}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* New expiry preview */}
          <div className="bg-brand-600/10 border border-brand-600/30 rounded-xl px-4 py-3">
            <p className="text-xs text-brand-300 mb-0.5">Nueva fecha de expiración</p>
            <p className="text-white font-semibold">
              {format(newExpiry, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-surface-border text-slate-400 hover:text-white text-sm transition-colors">
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
              {submitting ? 'Renovando…' : 'Confirmar renovación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
