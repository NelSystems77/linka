import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/core/config/firebase.config'
import { getUserById, isAccountActive, updateLastSeen } from '@/domains/users/services/users.service'
import { generateAndStoreKeyPair, getStoredKeyPair } from '@/domains/crypto/services/keyManager.service'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/core/config/firebase.config'
import type { AppUser } from '@/domains/users/types/user.types'
import type { LoginCredentials } from '../types/auth.types'

// Deduplication: if both signIn and useAuthBootstrap call ensureE2eeKeys concurrently
// (which happens during explicit login), they share the same promise to avoid generating
// two different key pairs.
let _keyBootstrapPromise: Promise<void> | null = null

export function ensureE2eeKeys(uid: string, publicKeyInFirestore: string): Promise<void> {
  if (!_keyBootstrapPromise) {
    _keyBootstrapPromise = _doEnsureE2eeKeys(uid, publicKeyInFirestore).finally(() => {
      _keyBootstrapPromise = null
    })
  }
  return _keyBootstrapPromise
}

async function _doEnsureE2eeKeys(uid: string, publicKeyInFirestore: string): Promise<void> {
  const existingPair = await getStoredKeyPair(uid)
  if (!existingPair) {
    // No key in IndexedDB (first login or browser data cleared) → generate and upload
    const publicKey = await generateAndStoreKeyPair(uid)
    await updateDoc(doc(firestore, 'users', uid), { publicKey })
  } else if (!publicKeyInFirestore || publicKeyInFirestore !== existingPair.publicKeySpki) {
    // Firestore is empty OR has a different key (logged in from another device) → sync current device's key
    await updateDoc(doc(firestore, 'users', uid), { publicKey: existingPair.publicKeySpki })
  }
}

export async function signIn(credentials: LoginCredentials): Promise<AppUser> {
  const { user: fbUser } = await signInWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password
  )

  const appUser = await getUserById(fbUser.uid)
  if (!appUser) throw new Error('Perfil de usuario no encontrado.')
  if (!isAccountActive(appUser)) throw new Error('Cuenta expirada o bloqueada.')

  await ensureE2eeKeys(fbUser.uid, appUser.publicKey)
  await updateLastSeen(fbUser.uid)
  return appUser
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const fbUser = auth.currentUser
  if (!fbUser || !fbUser.email) throw new Error('No hay sesión activa.')

  const credential = EmailAuthProvider.credential(fbUser.email, currentPassword)
  await reauthenticateWithCredential(fbUser, credential)
  await updatePassword(fbUser, newPassword)
  await updateDoc(doc(firestore, 'users', fbUser.uid), { mustChangePassword: false })
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}

export function onAuthChange(
  callback: (fbUser: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback)
}
