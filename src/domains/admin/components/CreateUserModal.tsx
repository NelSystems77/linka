import { useState } from 'react'
import type { AdminCreateUserDTO } from '../types/admin.types'
import type { RenewalCycle } from '@/domains/users/types/user.types'

interface Props {
  onClose:  () => void
  onSubmit: (dto: AdminCreateUserDTO) => Promise<void>
  submitting: boolean
}

const CYCLES: RenewalCycle[] = [3, 6, 9, 12]

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => chars[b % chars.length])
    .join('')
}

export default function CreateUserModal({ onClose, onSubmit, submitting }: Props) {
  const [form, setForm] = useState<AdminCreateUserDTO>({
    email:             '',
    displayName:       '',
    role:              'user',
    plan:              'free',
    cycleMonths:       3,
    temporaryPassword: generatePassword(),
  })
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function set<K extends keyof AdminCreateUserDTO>(key: K, value: AdminCreateUserDTO[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await onSubmit(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario')
    }
  }

  function copyPassword() {
    navigator.clipboard.writeText(form.temporaryPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-lg font-bold text-white">Crear nuevo usuario</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nombre completo</label>
              <input
                type="text" required value={form.displayName}
                onChange={e => set('displayName', e.target.value)}
                placeholder="María García"
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Email</label>
              <input
                type="email" required value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="maria@empresa.com"
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Role + Plan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Rol</label>
              <select
                value={form.role} onChange={e => set('role', e.target.value as AdminCreateUserDTO['role'])}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Plan</label>
              <select
                value={form.plan} onChange={e => set('plan', e.target.value as AdminCreateUserDTO['plan'])}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="free">Free (TTL 24h)</option>
                <option value="full">Full (histórico)</option>
              </select>
            </div>
          </div>

          {/* Renewal cycle */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Ciclo de acceso</label>
            <div className="grid grid-cols-4 gap-2">
              {CYCLES.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => set('cycleMonths', c)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.cycleMonths === c
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-surface border-surface-border text-slate-400 hover:border-brand-500'
                  }`}
                >
                  {c} meses
                </button>
              ))}
            </div>
          </div>

          {/* Temporary password */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Contraseña temporal</label>
            <div className="flex gap-2">
              <input
                type="text" value={form.temporaryPassword}
                onChange={e => set('temporaryPassword', e.target.value)}
                className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button type="button" onClick={() => set('temporaryPassword', generatePassword())}
                className="px-3 py-2 bg-surface border border-surface-border rounded-lg text-slate-400 hover:text-white text-sm transition-colors" title="Regenerar">
                🔄
              </button>
              <button type="button" onClick={copyPassword}
                className="px-3 py-2 bg-surface border border-surface-border rounded-lg text-slate-400 hover:text-white text-sm transition-colors">
                {copied ? '✓' : '📋'}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">Comparte esta contraseña al usuario de forma segura.</p>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-surface-border text-slate-400 hover:text-white text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
              {submitting ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
