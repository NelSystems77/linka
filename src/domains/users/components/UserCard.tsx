import clsx from 'clsx'
import type { AppUser, UserStatus } from '../types/user.types'

interface Props {
  user: AppUser
  isActive: boolean
  isOnline: boolean
  isPending?: boolean
  onClick: () => void
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

function statusDot(status: UserStatus, isOnline: boolean) {
  // isOnline (WS) overrides Firestore status for live accuracy
  const effective: UserStatus = !isOnline ? 'offline' : status === 'busy' ? 'busy' : 'available'
  if (effective === 'available') return { cls: 'bg-green-400',  label: 'Disponible' }
  if (effective === 'busy')      return { cls: 'bg-amber-400',  label: 'Ocupado' }
  return                                { cls: 'bg-slate-500',  label: 'Desconectado' }
}

export default function UserCard({ user, isActive, isOnline, isPending = false, onClick }: Props) {
  const initials = user.displayName
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const gradient = avatarGradient(user.displayName)
  const dot      = statusDot(user.status ?? 'offline', isOnline)

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100 relative',
        isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
      )}
    >
      {/* Active accent bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-9 bg-brand-500 rounded-r-full" />
      )}

      {/* Avatar */}
      <div className="relative shrink-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-11 h-11 rounded-full object-cover"
          />
        ) : (
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient}
                          flex items-center justify-center text-sm font-semibold text-white select-none`}>
            {initials}
          </div>
        )}
        <span
          className={clsx('absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0c1220]', dot.cls)}
          title={dot.label}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={clsx(
          'text-sm font-medium truncate leading-snug',
          isActive ? 'text-white' : 'text-slate-200'
        )}>
          {user.displayName}
        </p>
        <p className="text-xs truncate mt-0.5">
          {isPending
            ? <span className="text-amber-400 animate-pulse">Esperando respuesta…</span>
            : <span className="text-slate-500">{dot.label}</span>
          }
        </p>
      </div>
    </button>
  )
}
