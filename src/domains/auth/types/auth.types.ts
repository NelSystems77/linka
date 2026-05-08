import type { AppUser } from '@/domains/users/types/user.types'

export interface AuthState {
  user: AppUser | null
  firebaseUid: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}
