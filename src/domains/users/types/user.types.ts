export type UserRole = 'super_admin' | 'admin' | 'user'
export type UserPlan = 'free' | 'full'
export type UserStatus = 'available' | 'busy' | 'offline'
export type RenewalCycle = 3 | 6 | 9 | 12

export interface RenewalRecord {
  renewedAt: number        // unix ms
  cycleMonths: RenewalCycle
  renewedBy: string        // uid of the admin
}

export interface AppUser {
  uid: string
  email: string
  displayName: string
  avatarUrl: string | null
  role: UserRole
  plan: UserPlan
  /** Base64 SPKI — stored on server so others can encrypt messages to this user */
  publicKey: string
  createdAt: number
  /** null = no expiry (Super Admin). Block access when Date.now() > expiresAt */
  expiresAt: number | null
  renewalHistory: RenewalRecord[]
  isBlocked: boolean
  lastSeenAt: number
  /** true when the account was created or password was reset by an admin — forces a password change on next login */
  mustChangePassword: boolean
  status: UserStatus
}

export interface CreateUserPayload {
  email: string
  displayName: string
  role: UserRole
  plan: UserPlan
  cycleMonths: RenewalCycle
}
