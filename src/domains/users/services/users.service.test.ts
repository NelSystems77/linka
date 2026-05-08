import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAccountActive, getUserById, renewUser } from './users.service'
import type { AppUser } from '../types/user.types'

// ── Firebase mocks ─────────────────────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  doc:         vi.fn(),
  getDoc:      vi.fn(),
  updateDoc:   vi.fn(),
  collection:  vi.fn(),
  getDocs:     vi.fn(),
  query:       vi.fn(),
  where:       vi.fn(),
  setDoc:      vi.fn(),
  serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
}))

import { getDoc, updateDoc } from 'firebase/firestore'

// ── Fixtures ───────────────────────────────────────────────────────────────
function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    uid:                'uid-test',
    email:              'test@linka.app',
    displayName:        'Test User',
    avatarUrl:          null,
    role:               'user',
    plan:               'free',
    publicKey:          'base64-spki',
    createdAt:          Date.now() - 86_400_000,
    expiresAt:          Date.now() + 30 * 86_400_000,
    renewalHistory:     [],
    isBlocked:          false,
    lastSeenAt:         Date.now(),
    mustChangePassword: false,
    status:             'offline',
    ...overrides,
  }
}

// ── isAccountActive ────────────────────────────────────────────────────────
describe('isAccountActive', () => {
  it('returns true for a healthy user (not blocked, not expired)', () => {
    expect(isAccountActive(makeUser())).toBe(true)
  })

  it('returns false when user is blocked', () => {
    expect(isAccountActive(makeUser({ isBlocked: true }))).toBe(false)
  })

  it('returns false when account has expired', () => {
    expect(isAccountActive(makeUser({ expiresAt: Date.now() - 1 }))).toBe(false)
  })

  it('returns true when expiresAt is exactly null (super_admin / no-expiry)', () => {
    expect(isAccountActive(makeUser({ expiresAt: null, role: 'super_admin' }))).toBe(true)
  })

  it('returns true when expiry is 1 ms in the future', () => {
    expect(isAccountActive(makeUser({ expiresAt: Date.now() + 1 }))).toBe(true)
  })

  it('blocked takes priority over a valid expiry', () => {
    const futureExpiry = Date.now() + 99_999_999
    expect(isAccountActive(makeUser({ isBlocked: true, expiresAt: futureExpiry }))).toBe(false)
  })
})

// ── getUserById ────────────────────────────────────────────────────────────
describe('getUserById', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns user data when document exists', async () => {
    const mockUser = makeUser()
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => mockUser } as any)

    const result = await getUserById('uid-test')
    expect(result).toEqual(mockUser)
  })

  it('returns null when document does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as any)

    const result = await getUserById('non-existent')
    expect(result).toBeNull()
  })
})

// ── renewUser ──────────────────────────────────────────────────────────────
describe('renewUser', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('extends expiresAt by the cycle duration from today when already expired', async () => {
    const expiredUser = makeUser({ expiresAt: Date.now() - 86_400_000 })  // expired yesterday
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => expiredUser } as any)
    vi.mocked(updateDoc).mockResolvedValue(undefined)

    const before = Date.now()
    await renewUser('uid-test', 3, 'admin-uid')
    const after = Date.now()

    const call    = vi.mocked(updateDoc).mock.calls[0]!
    const payload = call[1] as unknown as Record<string, unknown>
    const newExpiry = payload['expiresAt'] as number

    const expectedMs = 3 * 30 * 24 * 60 * 60 * 1000
    expect(newExpiry).toBeGreaterThanOrEqual(before + expectedMs)
    expect(newExpiry).toBeLessThanOrEqual(after + expectedMs)
  })

  it('appends a renewal record to renewalHistory', async () => {
    const user = makeUser({ renewalHistory: [] })
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => user } as any)
    vi.mocked(updateDoc).mockResolvedValue(undefined)

    await renewUser('uid-test', 6, 'admin-uid')

    const call    = vi.mocked(updateDoc).mock.calls[0]!
    const payload = call[1] as unknown as Record<string, unknown>
    const history = payload['renewalHistory'] as unknown[]

    expect(history).toHaveLength(1)
    expect((history[0] as Record<string, unknown>)['cycleMonths']).toBe(6)
    expect((history[0] as Record<string, unknown>)['renewedBy']).toBe('admin-uid')
  })

  it('resets isBlocked to false on renewal', async () => {
    const blocked = makeUser({ isBlocked: true, expiresAt: Date.now() - 1 })
    vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => blocked } as any)
    vi.mocked(updateDoc).mockResolvedValue(undefined)

    await renewUser('uid-test', 3, 'admin-uid')

    const call    = vi.mocked(updateDoc).mock.calls[0]!
    const payload = call[1] as unknown as Record<string, unknown>
    expect(payload['isBlocked']).toBe(false)
  })

  it('throws when user is not found', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as any)
    await expect(renewUser('ghost', 3, 'admin')).rejects.toThrow('User not found')
  })
})
