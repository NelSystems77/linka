import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { changePassword, signOut } from '@/domains/auth/services/auth.service'
import { useAuthStore } from '@/domains/auth/store/auth.store'
import { useAuth } from '@/domains/auth/hooks/useAuth'

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length

  const color =
    score <= 1 ? 'bg-red-500' :
    score === 2 ? 'bg-orange-400' :
    score === 3 ? 'bg-yellow-400' :
    'bg-emerald-500'

  const label =
    score <= 1 ? 'Muy débil' :
    score === 2 ? 'Débil' :
    score === 3 ? 'Aceptable' :
    'Segura'

  if (!password) return null

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < score ? color : 'bg-slate-700'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${score <= 1 ? 'text-red-400' : score === 2 ? 'text-orange-400' : score === 3 ? 'text-yellow-400' : 'text-emerald-400'}`}>
        {label}
      </p>
    </div>
  )
}

export default function ForcePasswordChangePage() {
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const setUser     = useAuthStore(s => s.setUser)

  const [currentPwd, setCurrentPwd]   = useState('')
  const [newPwd,     setNewPwd]       = useState('')
  const [confirmPwd, setConfirmPwd]   = useState('')
  const [showCur,    setShowCur]      = useState(false)
  const [showNew,    setShowNew]      = useState(false)
  const [showCon,    setShowCon]      = useState(false)
  const [loading,    setLoading]      = useState(false)
  const [error,      setError]        = useState<string | null>(null)

  const passwordsMatch = newPwd === confirmPwd
  const isStrong       = newPwd.length >= 8
  const canSubmit      = currentPwd && newPwd && confirmPwd && passwordsMatch && isStrong && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    if (!passwordsMatch) { setError('Las contraseñas no coinciden.'); return }
    if (!isStrong)       { setError('La contraseña debe tener al menos 8 caracteres.'); return }

    setError(null)
    setLoading(true)
    try {
      await changePassword(currentPwd, newPwd)
      // Update store so mustChangePassword reflects false without full reload
      if (user) setUser({ ...user, mustChangePassword: false })
      navigate(
        user?.role === 'super_admin' || user?.role === 'admin' ? '/admin' : '/chat',
        { replace: true }
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar la contraseña.'
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('La contraseña actual es incorrecta.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand-700/20 blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-violet-700/15 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-brand-900/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="glass rounded-3xl p-8 shadow-modal">

          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white">Cambio de contraseña requerido</h1>
            <p className="text-xs text-slate-400 text-center mt-1.5 leading-relaxed">
              Tu cuenta usa una contraseña temporal.<br />Crea una nueva para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Current password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Contraseña actual (temporal)
              </label>
              <div className="relative">
                <input
                  type={showCur ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input-field pr-11"
                  placeholder="••••••••••"
                />
                <button type="button" onClick={() => setShowCur(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}>
                  <EyeIcon open={showCur} />
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="input-field pr-11"
                  placeholder="••••••••••"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}>
                  <EyeIcon open={showNew} />
                </button>
              </div>
              <PasswordStrengthBar password={newPwd} />
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showCon ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={`input-field pr-11 ${confirmPwd && !passwordsMatch ? 'border-red-500/50 focus:border-red-500' : ''}`}
                  placeholder="••••••••••"
                />
                <button type="button" onClick={() => setShowCon(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}>
                  <EyeIcon open={showCon} />
                </button>
              </div>
              {confirmPwd && !passwordsMatch && (
                <p className="text-xs text-red-400">Las contraseñas no coinciden.</p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 text-red-400 text-sm">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando…
                </>
              ) : 'Establecer nueva contraseña'}
            </button>
          </form>

          <button
            onClick={handleSignOut}
            className="w-full mt-3 text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
