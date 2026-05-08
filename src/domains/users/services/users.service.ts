import {
  collection, doc, getDoc, getDocs, query,
  where, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { firestore } from '@/core/config/firebase.config'
import type { AppUser, CreateUserPayload, RenewalCycle, UserStatus } from '../types/user.types'

const COL = 'users'

function cycleToMs(months: RenewalCycle): number {
  return months * 30 * 24 * 60 * 60 * 1000
}

export async function getUserById(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(firestore, COL, uid))
  if (!snap.exists()) return null
  return snap.data() as AppUser
}

export async function getAllActiveUsers(): Promise<AppUser[]> {
  const now = Date.now()
  const snap = await getDocs(
    query(
      collection(firestore, COL),
      where('isBlocked', '==', false)
    )
  )
  return snap.docs
    .map(d => d.data() as AppUser)
    .filter(u => u.expiresAt === null || u.expiresAt > now)
}

export async function createUser(
  uid: string,
  payload: CreateUserPayload,
  publicKey: string
): Promise<void> {
  const expiresAt = Date.now() + cycleToMs(payload.cycleMonths)
  const user: AppUser = {
    uid,
    email: payload.email,
    displayName: payload.displayName,
    avatarUrl: null,
    role: payload.role,
    plan: payload.plan,
    publicKey,
    createdAt: Date.now(),
    expiresAt: payload.role === 'super_admin' ? null : expiresAt,
    renewalHistory: [{ renewedAt: Date.now(), cycleMonths: payload.cycleMonths, renewedBy: 'system' }],
    isBlocked: false,
    lastSeenAt: Date.now(),
    status: 'offline',
  }
  await setDoc(doc(firestore, COL, uid), user)
}

export async function renewUser(
  uid: string,
  cycleMonths: RenewalCycle,
  renewedBy: string
): Promise<void> {
  const current = await getUserById(uid)
  if (!current) throw new Error('User not found')

  const base      = Math.max(current.expiresAt ?? Date.now(), Date.now())
  const expiresAt = base + cycleToMs(cycleMonths)

  await updateDoc(doc(firestore, COL, uid), {
    expiresAt,
    renewalHistory: [
      ...current.renewalHistory,
      { renewedAt: Date.now(), cycleMonths, renewedBy },
    ],
    isBlocked: false,
  })
}

export async function blockUser(uid: string): Promise<void> {
  await updateDoc(doc(firestore, COL, uid), { isBlocked: true })
}

export async function updateLastSeen(uid: string): Promise<void> {
  await updateDoc(doc(firestore, COL, uid), { lastSeenAt: serverTimestamp() })
}

export async function updateUserStatus(uid: string, status: UserStatus): Promise<void> {
  await updateDoc(doc(firestore, COL, uid), { status })
}

/** Returns the public RSA key for a given user — needed to encrypt messages for them */
export async function getPublicKey(uid: string): Promise<string | null> {
  const user = await getUserById(uid)
  return user?.publicKey ?? null
}

/** Guards: returns false if account is expired or blocked */
export function isAccountActive(user: AppUser): boolean {
  if (user.isBlocked) return false
  if (user.expiresAt !== null && Date.now() > user.expiresAt) return false
  return true
}
