import { useCallback } from 'react'
import { generateAndStoreKeyPair, getStoredKeyPair } from '../services/keyManager.service'
import { encryptMessage, decryptMessage, encryptFile, type Participant } from '../services/e2ee.service'
import type { RecipientSlot, MessageEncryptedPayload } from '../types/crypto.types'

export function useCrypto(uid: string) {
  /** Call once after first login. Returns the public key SPKI to upload to Firestore. */
  const initKeyPair = useCallback(async (): Promise<string> => {
    const existing = await getStoredKeyPair(uid)
    if (existing) return existing.publicKeySpki
    return generateAndStoreKeyPair(uid)
  }, [uid])

  const encrypt = useCallback(
    (plaintext: string, participants: Participant[]): Promise<MessageEncryptedPayload> =>
      encryptMessage(plaintext, participants),
    []
  )

  const decrypt = useCallback(
    (slot: RecipientSlot): Promise<string | null> =>
      decryptMessage(slot, uid),
    [uid]
  )

  const encryptBinaryFile = useCallback(
    (buffer: ArrayBuffer, participants: Participant[]) =>
      encryptFile(buffer, participants),
    []
  )

  return { initKeyPair, encrypt, decrypt, encryptBinaryFile }
}
