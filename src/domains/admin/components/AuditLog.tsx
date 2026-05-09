import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { AuditLogEntry, AdminAction } from '../types/admin.types'

interface Props {
  entries: AuditLogEntry[]
  onClear?: (ids?: string[]) => Promise<void>
  submitting?: boolean
}

const ACTION_META: Record<AdminAction, { label: string; color: string; bg: string; iconPath: string }> = {
  'user.create': {
    label: 'Usuario creado',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  'user.block': {
    label: 'Cuenta bloqueada',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
  'user.unblock': {
    label: 'Cuenta desbloqueada',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    iconPath: 'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
  },
  'user.renew': {
    label: 'Acceso renovado',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10 border-brand-500/20',
    iconPath: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  },
  'user.delete': {
    label: 'Usuario eliminado',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    iconPath: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  },
  'user.role_change': {
    label: 'Rol modificado',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    iconPath: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  },
  'user.password_reset': {
    label: 'Contraseña reseteada',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    iconPath: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  },
  'admin.login': {
    label: 'Inicio de sesión',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    iconPath: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
  },
}

const PAGE_SIZE = 20

// Helper to convert any createdAt value to a Date
const toDate = (val: unknown): Date | null => {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'object' && '_seconds' in (val as object)) {
    return new Date((val as { _seconds: number })._seconds * 1000)
  }
  const d = new Date(val as string | number)
  return isNaN(d.getTime()) ? null : d
}

export default function AuditLog({ entries, onClear, submitting }: Props) {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Confirm dialogs
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [confirmClearSelected, setConfirmClearSelected] = useState(false)

  const totalPages = Math.ceil(entries.length / PAGE_SIZE)
  const visible = entries.slice(0, page * PAGE_SIZE)
  const hasMore = page < totalPages

  // ── Selection helpers ──────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === visible.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visible.map(e => e.id)))
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
    setConfirmClearSelected(false)
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleClearAll() {
    if (!onClear) return
    await onClear()
    setConfirmClearAll(false)
    setPage(1)
    exitSelectionMode()
  }

  async function handleClearSelected() {
    if (!onClear || selectedIds.size === 0) return
    await onClear(Array.from(selectedIds))
    setConfirmClearSelected(false)
    exitSelectionMode()
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm">No hay entradas en el registro de auditoría.</p>
      </div>
    )
  }

  const allVisibleSelected = visible.length > 0 && selectedIds.size === visible.length
  const someSelected = selectedIds.size > 0 && !allVisibleSelected

  return (
    <div className="space-y-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-600">
          Mostrando <span className="text-slate-400 font-medium">{visible.length}</span> de{' '}
          <span className="text-slate-400 font-medium">{entries.length}</span> eventos
          {selectionMode && selectedIds.size > 0 && (
            <span className="text-brand-400 font-medium ml-2">
              · {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
          )}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Real-time indicator */}
          {!selectionMode && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/60 animate-pulse" />
              <span className="text-[10px] text-slate-600">Tiempo real</span>
            </div>
          )}

          {/* ── Normal mode buttons ── */}
          {!selectionMode && onClear && (
            <>
              {/* Select mode toggle */}
              <button
                onClick={() => { setSelectionMode(true); setConfirmClearAll(false) }}
                disabled={submitting}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg
                           border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05]
                           transition-all duration-150 disabled:opacity-40"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Seleccionar
              </button>

              {/* Clear all button */}
              {!confirmClearAll && (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg
                             border border-red-500/20 text-red-400 hover:bg-red-500/10
                             transition-all duration-150 disabled:opacity-40"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Borrar todo
                </button>
              )}

              {/* Confirm clear all */}
              {confirmClearAll && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 animate-fade-in">
                  <span className="text-[11px] text-red-400">¿Borrar todos los logs?</span>
                  <button
                    onClick={handleClearAll}
                    disabled={submitting}
                    className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                  >
                    {submitting ? 'Borrando…' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => setConfirmClearAll(false)}
                    disabled={submitting}
                    className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Selection mode toolbar ── */}
          {selectionMode && (
            <div className="flex items-center gap-2 flex-wrap animate-fade-in">
              {/* Select all toggle */}
              <button
                onClick={toggleSelectAll}
                disabled={submitting}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg
                           border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05]
                           transition-all duration-150 disabled:opacity-40"
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors
                  ${allVisibleSelected
                    ? 'bg-brand-500 border-brand-500'
                    : someSelected
                      ? 'bg-brand-500/30 border-brand-500/60'
                      : 'border-white/20'
                  }`}
                >
                  {(allVisibleSelected || someSelected) && (
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}
                        d={allVisibleSelected ? 'M5 13l4 4L19 7' : 'M20 12H4'} />
                    </svg>
                  )}
                </span>
                {allVisibleSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>

              {/* Delete selected */}
              {selectedIds.size > 0 && !confirmClearSelected && (
                <button
                  onClick={() => setConfirmClearSelected(true)}
                  disabled={submitting}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg
                             border border-red-500/20 text-red-400 hover:bg-red-500/10
                             transition-all duration-150 disabled:opacity-40"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Borrar {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                </button>
              )}

              {/* Confirm delete selected */}
              {confirmClearSelected && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 animate-fade-in">
                  <span className="text-[11px] text-red-400">
                    ¿Borrar {selectedIds.size} log{selectedIds.size !== 1 ? 's' : ''}?
                  </span>
                  <button
                    onClick={handleClearSelected}
                    disabled={submitting}
                    className="text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                  >
                    {submitting ? 'Borrando…' : 'Confirmar'}
                  </button>
                  <button
                    onClick={() => setConfirmClearSelected(false)}
                    disabled={submitting}
                    className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Cancel selection mode */}
              <button
                onClick={exitSelectionMode}
                disabled={submitting}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg
                           border border-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]
                           transition-all duration-150 disabled:opacity-40"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Entries ── */}
      <div className="space-y-2">
        {visible.map(entry => {
          const meta = ACTION_META[entry.action] ?? {
            label: entry.action,
            color: 'text-slate-400',
            bg: 'bg-slate-500/10 border-slate-500/20',
            iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
          }

          const dateObj = toDate(entry.createdAt)

          const ts = dateObj
            ? formatDistanceToNow(dateObj, { locale: es, addSuffix: true })
            : '—'

          const tsAbsolute = dateObj
            ? format(dateObj, "d MMM yyyy 'a las' HH:mm", { locale: es })
            : ''

          const hasMetadata = Object.keys(entry.metadata).length > 0
          const isExpanded = expandedId === entry.id
          const isSelected = selectedIds.has(entry.id)

          return (
            <div
              key={entry.id}
              className={`glass rounded-xl border transition-all duration-150 overflow-hidden
                ${isSelected
                  ? 'border-brand-500/40 bg-brand-500/5'
                  : 'border-white/[0.06] hover:border-white/[0.10]'
                }`}
            >
              <div className="flex items-start gap-3 p-4">

                {/* Checkbox (selection mode) */}
                {selectionMode && (
                  <button
                    onClick={() => toggleSelect(entry.id)}
                    className="mt-0.5 shrink-0 focus:outline-none"
                    aria-label={isSelected ? 'Deseleccionar' : 'Seleccionar'}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                      ${isSelected
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>
                )}

                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg}`}>
                  <svg className={`w-4 h-4 ${meta.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={meta.iconPath} />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className="text-[10px] text-slate-600 shrink-0 tabular-nums" title={tsAbsolute}>
                      {ts}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {/* Actor */}
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-xs text-slate-500">
                        Actor: <code className="text-slate-400 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">
                          {entry.actorUid.slice(0, 12)}…
                        </code>
                      </span>
                    </div>

                    {/* Target */}
                    {entry.targetUid && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-slate-500">
                          Objetivo: <code className="text-slate-400 bg-white/[0.04] px-1 py-0.5 rounded text-[10px]">
                            {entry.targetUid.slice(0, 12)}…
                          </code>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Metadata toggle */}
                  {hasMetadata && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="flex items-center gap-1 mt-2 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      <svg
                        className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded metadata */}
              {isExpanded && hasMetadata && (
                <div className="px-4 pb-4 animate-fade-in">
                  <div className="bg-black/20 rounded-xl p-3 border border-white/[0.04]">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2 font-semibold">Metadatos</p>
                    <pre className="text-[11px] text-slate-400 font-mono whitespace-pre-wrap break-all leading-relaxed">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Load more ── */}
      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full py-3 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white
                     hover:bg-white/[0.04] text-sm transition-all duration-150 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
          Cargar más ({entries.length - visible.length} restantes)
        </button>
      )}
    </div>
  )
}
