import { useEffect } from 'react'
import { useAuthStore } from '../store/auth.store'
import { onAuthChange, signOut } from '../services/auth.service'
import { getUserById, isAccountActive } from '@/domains/users/services/users.service'

export function useAuthBootstrap() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthChange(async fbUser => {
      if (!fbUser) { setUser(null); return }

      const appUser = await getUserById(fbUser.uid)
      if (!appUser || !isAccountActive(appUser)) {
        await signOut()
        setUser(null)
        return
      }
      setUser(appUser)
    })
    return unsub
  }, [setUser])
}

export function useAuth() {
  const { user, isLoading } = useAuthStore()
  return {
    user,
    isLoading,
    isAuthenticated:    !!user,
    isSuperAdmin:       user?.role === 'super_admin',
    isAdmin:            user?.role === 'admin' || user?.role === 'super_admin',
    mustChangePassword: user?.mustChangePassword ?? false,
  }
}
