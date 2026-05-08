import { create } from 'zustand'
import type { AppUser } from '@/domains/users/types/user.types'

interface AuthStore {
  user: AppUser | null
  isLoading: boolean
  setUser: (user: AppUser | null) => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>(set => ({
  user: null,
  isLoading: true,
  setUser:    user      => set({ user, isLoading: false }),
  setLoading: isLoading => set({ isLoading }),
}))
