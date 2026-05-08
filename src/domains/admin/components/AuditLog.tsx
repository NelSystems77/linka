import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AuditLogEntry, AdminAction } from '../types/admin.types'

interface Props {
  entries: AuditLogEntry[]
}

const ACTION_META: Record<AdminAction, { label: string; icon: string; color: string }> = {
  'user.create':      { label: 'Usuario creado',    icon: '👤', color: 'text-green-400'  },
  'user.block':       { label: 'Cuenta bloqueada',  icon: '🚫', color: 'text-red-400'    },
  'user.unblock':     { label: 'Cuenta desbloqueada', icon: '✅', color: 'text-green-400' },
  'user.renew':       { label: 'Acceso renovado',   icon: '🔄', color: 'text-brand-400'  },
  'user.delete':      { label: 'Usuario eliminado', icon: '🗑',  color: 'text-red-400'    },
  'user.role_change':     { label: 'Rol modificado',       icon: '🏷',  color: 'text-amber-400'  },
  'user.password_reset':  { label: 'Contraseña reseteada', icon: '🔐', color: 'text-orange-400' },
  'admin.login':          { label: 'Inicio de sesión',     icon: '🔑', color: 'text-slate-400'  },
}

export default function AuditLog({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No hay entradas en el registro de auditoría.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map(entry => {
        const meta = ACTION_META[entry.action] ?? { label: entry.action, icon: '📋', color: 'text-slate-400' }
        const ts   = entry.createdAt
          ? formatDistanceToNow(new Date(entry.createdAt), { locale: es, addSuffix: true })
          : '—'

        return (
          <div key={entry.id}
            className="flex items-start gap-4 p-4 bg-surface-card border border-surface-border rounded-xl hover:border-slate-600 transition-colors">
            <span className="text-xl shrink-0 mt-0.5">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                {entry.targetUid && (
                  <span className="text-xs text-slate-600 font-mono truncate max-w-[140px]">
                    uid: {entry.targetUid.slice(0, 8)}…
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-600">
                  Por: <span className="text-slate-400 font-mono">{entry.actorUid.slice(0, 8)}…</span>
                </span>
                <span className="text-xs text-slate-600">{ts}</span>
              </div>
              {Object.keys(entry.metadata).length > 0 && (
                <p className="text-xs text-slate-600 mt-1 font-mono truncate">
                  {JSON.stringify(entry.metadata)}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
