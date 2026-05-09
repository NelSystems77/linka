import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useAdmin } from '../hooks/useAdmin'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { signOut } from '@/domains/auth/services/auth.service'
import { useAuthStore } from '@/domains/auth/store/auth.store'
import UserManagement  from './UserManagement'
import AuditLog        from './AuditLog'
import CreateUserModal from './CreateUserModal'
import StartChatModal  from './StartChatModal'

type Tab = 'users' | 'audit'

interface StatCardProps {
  label: string
  value: number
  color: string
  bg: string
  icon: React.ReactNode
}

function StatCard({ label, value, color, bg, icon }: StatCardProps) {
  return (
    <div className="glass rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const {
    users, auditLog, stats,
    loading, submitting, error,
    createUser, blockUser, unblockUser, renewUser, deleteUser,
  } = useAdmin()

  const { user }  = useAuth()
  const setUser   = useAuthStore(s => s.setUser)
  const navigate  = useNavigate()
  const [tab,             setTab]             = useState<Tab>('users')
  const [showCreateModal,    setShowCreateModal]    = useState(false)
  const [showStartChatModal, setShowStartChatModal] = useState(false)

  const initials = user?.displayName
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? 'A'

  async function handleSignOut() {
    await signOut()
    setUser(null)
  }

  return (
    <div className="min-h-screen bg-surface">

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06]"
              style={{ background: 'rgba(8,13,26,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center shadow-brand-glow">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <span className="text-white font-bold text-sm">Linka</span>
              <span className="text-slate-600 text-sm"> · Panel Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Go to Chat */}
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl
                         border border-white/[0.08] text-slate-400 hover:text-white
                         hover:bg-white/[0.05] transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 19l-7-7 7-7" />
              </svg>
              Ir al chat
            </button>

            {/* Start chat modal */}
            <button
              onClick={() => setShowStartChatModal(true)}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl
                         border border-white/[0.08] text-slate-300 hover:text-white
                         hover:bg-white/[0.05] transition-all duration-150"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Iniciar chat
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear usuario
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
              <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center
                              text-xs font-bold text-white">
                {initials}
              </div>
              <button
                onClick={handleSignOut}
                title="Cerrar sesión"
                className="text-slate-600 hover:text-slate-300 transition-colors p-1.5
                           rounded-lg hover:bg-white/[0.05]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20
                          rounded-2xl px-4 py-3 text-red-400 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} color="text-white" bg="bg-slate-500/10"
            icon={<svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatCard label="Activos" value={stats.active} color="text-green-400" bg="bg-green-500/10"
            icon={<svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard label="Expirados" value={stats.expired} color="text-amber-400" bg="bg-amber-500/10"
            icon={<svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard label="Bloqueados" value={stats.blocked} color="text-red-400" bg="bg-red-500/10"
            icon={<svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 glass rounded-2xl p-1 w-fit">
          {([['users', 'Usuarios'], ['audit', 'Auditoría']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={clsx('px-5 py-2 rounded-xl text-sm font-medium transition-all duration-150', {
                'bg-brand-gradient text-white shadow-brand-glow': tab === t,
                'text-slate-400 hover:text-white':               tab !== t,
              })}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">Cargando…</p>
          </div>
        ) : tab === 'users' ? (
          <UserManagement
            users={users}
            submitting={submitting}
            onBlock={blockUser}
            onUnblock={unblockUser}
            onRenew={renewUser}
            onDelete={deleteUser}
          />
        ) : (
          <AuditLog entries={auditLog} />
        )}
      </main>

      {showCreateModal && (
        <CreateUserModal
          submitting={submitting}
          onClose={() => setShowCreateModal(false)}
          onSubmit={createUser}
        />
      )}

      {showStartChatModal && (
        <StartChatModal
          users={users}
          onClose={() => setShowStartChatModal(false)}
        />
      )}
    </div>
  )
}
