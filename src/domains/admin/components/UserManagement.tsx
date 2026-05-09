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

const STATUS_DOT = {
  active:  'bg-green-400',
  expired: 'bg-amber-400',
  blocked: 'bg-red-400',
} as const

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  admin:       'bg-brand-500/10  text-brand-400  border-brand-500/20',
  user:        'bg-slate-500/10  text-slate-400  border-slate-500/20',
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  user:        'Usuario',
}

function DeleteConfirmModal({
  user,
  submitting,
  onConfirm,
  onCancel,
}: {
  user: AppUser
  submitting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 max-w-sm w-full shadow-modal animate-slide-up">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-white text-center mb-1">¿Eliminar usuario?</h3>
        <p className="text-slate-400 text-sm text-center mb-1">
          <span className="text-white font-medium">{user.displayName}</span>
        </p>
        <p className="text-slate-500 text-xs text-center mb-6 leading-relaxed">
          Se deshabilitará la cuenta en Firebase Auth. Los mensajes cifrados no se eliminan.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-surface-border text-slate-400
                       hover:text-white hover:border-slate-500 text-sm transition-all duration-150"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50
                       text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Eliminando…
              </>
            ) : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UserManagement({ users, submitting, onBlock, onUnblock, onRenew, onDelete }: Props) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [renewTarget,  setRenewTarget]  = useState<AppUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null)

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

  const filterCounts = useMemo(() => ({
    all:     users.length,
    active:  users.filter(u => userStatus(u) === 'active').length,
    expired: users.filter(u => userStatus(u) === 'expired').length,
    blocked: users.filter(u => userStatus(u) === 'blocked').length,
  }), [users])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none"
               fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por nombre, email o rol…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-xl pl-9 pr-4 py-2.5 text-sm
                       text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40
                       focus:border-brand-500/30 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1 bg-surface rounded-xl p-1 border border-surface-border shrink-0">
          {(['all', 'active', 'expired', 'blocked'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                statusFilter === s
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              )}
            >
              {s !== 'all' && (
                <span className={clsx('w-1.5 h-1.5 rounded-full', {
                  'bg-green-400': s === 'active',
                  'bg-amber-400': s === 'expired',
                  'bg-red-400':   s === 'blocked',
                })} />
              )}
              {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
              <span className={clsx(
                'text-[10px] tabular-nums',
                statusFilter === s ? 'text-white/70' : 'text-slate-600'
              )}>
                {filterCounts[s]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-surface-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border" style={{ background: 'rgba(15,23,41,0.8)' }}>
              {['Usuario', 'Rol', 'Plan', 'Estado', 'Expira', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm">No se encontraron usuarios</p>
                    {search && (
                      <button onClick={() => setSearch('')} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(user => {
              const status = userStatus(user)
              const avatarInitials = user.displayName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
              return (
                <tr key={user.uid} className="hover:bg-white/[0.025] transition-colors group">
                  {/* User */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-600 to-violet-700
                                        flex items-center justify-center text-xs font-bold text-white">
                          {avatarInitials}
                        </div>
                        <span className={clsx(
                          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-card',
                          STATUS_DOT[status]
                        )} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate text-sm">{user.displayName}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3.5">
                    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium border', ROLE_BADGE[user.role] ?? ROLE_BADGE['user'])}>
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3.5">
                    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium border', {
                      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20': user.plan === 'full',
                      'bg-slate-500/10 text-slate-400 border-slate-500/20':   user.plan === 'free',
                    })}>
                      {user.plan === 'full' ? '✦ Full' : 'Free'}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium border', STATUS_BADGE[status])}>
                      {STATUS_LABEL[status]}
                    </span>
                  </td>

                  {/* Expiry */}
                  <td className="px-4 py-3.5">
                    {user.expiresAt ? (
                      <div>
                        <p className={clsx('text-xs font-medium', {
                          'text-red-400': user.expiresAt <= Date.now(),
                          'text-amber-400': user.expiresAt > Date.now() && user.expiresAt - Date.now() < 7 * 24 * 60 * 60 * 1000,
                          'text-slate-400': user.expiresAt - Date.now() >= 7 * 24 * 60 * 60 * 1000,
                        })}>
                          {format(new Date(user.expiresAt), "d MMM yyyy", { locale: es })}
                        </p>
                        {user.expiresAt <= Date.now() && (
                          <p className="text-[10px] text-red-500/70 mt-0.5">Expirado</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">Sin límite</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {/* Renew */}
                      <button
                        onClick={() => setRenewTarget(user)}
                        disabled={submitting}
                        title="Renovar acceso"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                                   bg-brand-600/10 text-brand-400 hover:bg-brand-600/20
                                   text-xs font-medium border border-brand-600/20
                                   transition-all duration-150 disabled:opacity-40"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Renovar
                      </button>

                      {/* Block / Unblock */}
                      {user.isBlocked ? (
                        <button
                          onClick={() => onUnblock(user.uid)}
                          disabled={submitting}
                          title="Desbloquear cuenta"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                                     bg-green-600/10 text-green-400 hover:bg-green-600/20
                                     text-xs font-medium border border-green-600/20
                                     transition-all duration-150 disabled:opacity-40"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                          Desbloquear
                        </button>
                      ) : (
                        <button
                          onClick={() => onBlock(user.uid)}
                          disabled={submitting || user.role === 'super_admin'}
                          title={user.role === 'super_admin' ? 'No se puede bloquear al Super Admin' : 'Bloquear cuenta'}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                                     bg-amber-600/10 text-amber-400 hover:bg-amber-600/20
                                     text-xs font-medium border border-amber-600/20
                                     transition-all duration-150 disabled:opacity-40"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Bloquear
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(user)}
                        disabled={submitting || user.role === 'super_admin'}
                        title={user.role === 'super_admin' ? 'No se puede eliminar al Super Admin' : 'Eliminar usuario'}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10
                                   transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-600">
          Mostrando <span className="text-slate-400 font-medium">{filtered.length}</span> de{' '}
          <span className="text-slate-400 font-medium">{users.length}</span> usuarios
        </p>
        {statusFilter !== 'all' && filtered.length > 0 && (
          <button
            onClick={() => setStatusFilter('all')}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Ver todos
          </button>
        )}
      </div>

      {/* Modals */}
      {renewTarget && (
        <RenewalModal
          user={renewTarget}
          submitting={submitting}
          onClose={() => setRenewTarget(null)}
          onConfirm={cycle => onRenew(renewTarget.uid, cycle)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          submitting={submitting}
          onConfirm={async () => { await onDelete(deleteTarget.uid); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
