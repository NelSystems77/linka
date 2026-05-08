import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'
import RenewalModal from './RenewalModal'
import type { AppUser, RenewalCycle } from '@/domains/users/types/user.types'

interface Props {
  users:       AppUser[]
  submitting:  boolean
  onBlock:     (uid: string) => Promise<void>
  onUnblock:   (uid: string) => Promise<void>
  onRenew:     (uid: string, cycle: RenewalCycle) => Promise<void>
  onDelete:    (uid: string) => Promise<void>
}

type StatusFilter = 'all' | 'active' | 'expired' | 'blocked'

function userStatus(u: AppUser): 'active' | 'expired' | 'blocked' {
  if (u.isBlocked) return 'blocked'
  if (u.expiresAt !== null && u.expiresAt <= Date.now()) return 'expired'
  return 'active'
}

const STATUS_BADGE = {
  active:  'bg-green-500/10 text-green-400 border-green-500/20',
  expired: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  blocked: 'bg-red-500/10  text-red-400  border-red-500/20',
} as const

const STATUS_LABEL = { active: 'Activo', expired: 'Expirado', blocked: 'Bloqueado' } as const

export default function UserManagement({ users, submitting, onBlock, onUnblock, onRenew, onDelete }: Props) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [renewTarget,  setRenewTarget]  = useState<AppUser | null>(null)
  const [deleteUid,    setDeleteUid]    = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users
      .filter(u => statusFilter === 'all' || userStatus(u) === statusFilter)
      .filter(u =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.includes(q)
      )
  }, [users, search, statusFilter])

  const ROLE_BADGE: Record<string, string> = {
    super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    admin:       'bg-brand-500/10  text-brand-400  border-brand-500/20',
    user:        'bg-slate-500/10  text-slate-400  border-slate-500/20',
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search" placeholder="Buscar por nombre, email o rol…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-surface border border-surface-border rounded-lg px-4 py-2 text-sm
                     text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex gap-1 bg-surface rounded-lg p-1 border border-surface-border">
          {(['all', 'active', 'expired', 'blocked'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={clsx('px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize', {
                'bg-brand-600 text-white': statusFilter === s,
                'text-slate-400 hover:text-white': statusFilter !== s,
              })}>
              {s === 'all' ? 'Todos' : STATUS_LABEL[s as keyof typeof STATUS_LABEL]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-surface-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface/50">
              {['Usuario', 'Rol', 'Plan', 'Estado', 'Expira', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No se encontraron usuarios.
                </td>
              </tr>
            )}
            {filtered.map(user => {
              const status = userStatus(user)
              return (
                <tr key={user.uid} className="hover:bg-white/[0.02] transition-colors">
                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {user.displayName[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{user.displayName}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs border', ROLE_BADGE[user.role] ?? ROLE_BADGE['user'])}>
                      {user.role}
                    </span>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs border', {
                      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20': user.plan === 'full',
                      'bg-slate-500/10 text-slate-400 border-slate-500/20':   user.plan === 'free',
                    })}>
                      {user.plan === 'full' ? 'Full' : 'Free'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs border', STATUS_BADGE[status])}>
                      {STATUS_LABEL[status]}
                    </span>
                  </td>

                  {/* Expiry */}
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {user.expiresAt
                      ? format(new Date(user.expiresAt), "d MMM yyyy", { locale: es })
                      : <span className="text-slate-600">Sin límite</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setRenewTarget(user)}
                        disabled={submitting}
                        title="Renovar acceso"
                        className="px-2.5 py-1 rounded-lg bg-brand-600/10 text-brand-400 hover:bg-brand-600/20
                                   text-xs font-medium border border-brand-600/20 transition-colors disabled:opacity-40"
                      >
                        Renovar
                      </button>

                      {user.isBlocked ? (
                        <button
                          onClick={() => onUnblock(user.uid)}
                          disabled={submitting}
                          title="Desbloquear cuenta"
                          className="px-2.5 py-1 rounded-lg bg-green-600/10 text-green-400 hover:bg-green-600/20
                                     text-xs font-medium border border-green-600/20 transition-colors disabled:opacity-40"
                        >
                          Desbloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => onBlock(user.uid)}
                          disabled={submitting || user.role === 'super_admin'}
                          title={user.role === 'super_admin' ? 'No se puede bloquear al Super Admin' : 'Bloquear cuenta'}
                          className="px-2.5 py-1 rounded-lg bg-amber-600/10 text-amber-400 hover:bg-amber-600/20
                                     text-xs font-medium border border-amber-600/20 transition-colors disabled:opacity-40"
                        >
                          Bloquear
                        </button>
                      )}

                      <button
                        onClick={() => setDeleteUid(user.uid)}
                        disabled={submitting || user.role === 'super_admin'}
                        title={user.role === 'super_admin' ? 'No se puede eliminar al Super Admin' : 'Eliminar usuario'}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-600">{filtered.length} de {users.length} usuarios</p>

      {/* Modals */}
      {renewTarget && (
        <RenewalModal
          user={renewTarget}
          submitting={submitting}
          onClose={() => setRenewTarget(null)}
          onConfirm={cycle => onRenew(renewTarget.uid, cycle)}
        />
      )}

      {deleteUid && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-slide-up">
            <h3 className="text-lg font-bold text-white mb-2">¿Eliminar usuario?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Esta acción deshabilitará la cuenta en Firebase Auth y bloqueará el acceso. No se eliminan los mensajes cifrados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUid(null)}
                className="flex-1 py-2.5 rounded-lg border border-surface-border text-slate-400 hover:text-white text-sm transition-colors">
                Cancelar
              </button>
              <button
                onClick={async () => { await onDelete(deleteUid); setDeleteUid(null) }}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
                {submitting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
