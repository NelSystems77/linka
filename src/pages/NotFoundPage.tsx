import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-brand-500">404</h1>
      <p className="text-slate-400">Página no encontrada</p>
      <Link to="/" className="text-brand-400 hover:underline text-sm">Volver al inicio</Link>
    </div>
  )
}
