import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import LoginPage               from '@/pages/LoginPage'
import ChatPage                from '@/pages/ChatPage'
import AdminPage               from '@/pages/AdminPage'
import ForcePasswordChangePage from '@/pages/ForcePasswordChangePage'
import NotFoundPage            from '@/pages/NotFoundPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/** Blocks access to any protected route while the user must change their password. */
function RequirePasswordChanged({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, mustChangePassword, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (mustChangePassword) return <Navigate to="/change-password" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth()
  if (isLoading) return null
  return isAdmin ? <>{children}</> : <Navigate to="/chat" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Locked screen — only accessible while mustChangePassword is true */}
        <Route path="/change-password" element={
          <RequireAuth><ForcePasswordChangePage /></RequireAuth>
        } />

        <Route path="/chat" element={
          <RequirePasswordChanged><ChatPage /></RequirePasswordChanged>
        } />

        <Route path="/admin" element={
          <RequirePasswordChanged><RequireAdmin><AdminPage /></RequireAdmin></RequirePasswordChanged>
        } />

        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
