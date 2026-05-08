import { useAuthBootstrap } from '@/domains/auth/hooks/useAuth'
import AppRouter from '@/core/router/AppRouter'
import SplashScreen from '@/shared/components/SplashScreen'
import { useAuthStore } from '@/domains/auth/store/auth.store'

export default function App() {
  useAuthBootstrap()
  const isLoading = useAuthStore(s => s.isLoading)

  if (isLoading) return <SplashScreen />

  return <AppRouter />
}
