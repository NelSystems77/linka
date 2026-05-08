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

export async function signIn(credentials: LoginCredentials): Promise<AppUser> {
  const { user: fbUser } = await signInWithEmailAndPassword(
    auth,
    credentials.email,
    credentials.password
  )

  const appUser = await getUserById(fbUser.uid)
  if (!appUser) throw new Error('Perfil de usuario no encontrado.')
  if (!isAccountActive(appUser)) throw new Error('Cuenta expirada o bloqueada.')

  // Bootstrap E2EE keys — generate if missing from IndexedDB, sync Firestore if out of date
  const existingPair = await getStoredKeyPair(fbUser.uid)
  if (!existingPair) {
    const publicKey = await generateAndStoreKeyPair(fbUser.uid)
    await updateDoc(doc(firestore, 'users', fbUser.uid), { publicKey })
  } else if (!appUser.publicKey) {
    // Key exists in IndexedDB but Firestore is empty — sync it
    await updateDoc(doc(firestore, 'users', fbUser.uid), { publicKey: existingPair.publicKeySpki })
  }

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
