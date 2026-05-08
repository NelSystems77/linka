import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'
import type { AppUser } from '@/domains/users/types/user.types'

const MOCK_USER: AppUser = {
  uid:                'uid-001',
  email:              'admin@linka.app',
  displayName:        'Nelson Admin',
  avatarUrl:          null,
  role:               'super_admin',
  plan:               'full',
  publicKey:          'spki-base64',
  createdAt:          1_700_000_000_000,
  expiresAt:          null,
  renewalHistory:     [],
  isBlocked:          false,
  lastSeenAt:         Date.now(),
  mustChangePassword: false,
  status:             'offline',
}

beforeEach(() => {
  useAuthStore.setState({ user: null, isLoading: true })
})

describe('useAuthStore', () => {
  it('has correct initial state', () => {
    const { user, isLoading } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isLoading).toBe(true)
  })

  it('setUser stores the user and sets isLoading to false', () => {
    useAuthStore.getState().setUser(MOCK_USER)
    const { user, isLoading } = useAuthStore.getState()
    expect(user).toEqual(MOCK_USER)
    expect(isLoading).toBe(false)
  })

  it('setUser(null) clears the user and sets isLoading to false', () => {
    useAuthStore.getState().setUser(MOCK_USER)
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('setLoading updates only the loading flag', () => {
    useAuthStore.getState().setUser(MOCK_USER)
    useAuthStore.getState().setLoading(true)
    expect(useAuthStore.getState().isLoading).toBe(true)
    expect(useAuthStore.getState().user).toEqual(MOCK_USER)   // user preserved
  })

  it('store state is isolated — reset between tests works', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })
})
