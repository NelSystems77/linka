import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { storage, firestore } from '@/core/config/firebase.config'
import { encryptFile, type Participant } from '@/domains/crypto/services/e2ee.service'
import { getPrivateKey } from '@/domains/crypto/services/keyManager.service'
import type { EncryptedFileRecord } from '../types/file.types'

const FREE_TTL_MS = 24 * 60 * 60 * 1000

export async function uploadEncryptedFile(
  file: File,
  conversationId: string,
  participants: Participant[],
  plan: 'free' | 'full'
): Promise<string> {
  // 1. Read + encrypt
  const buffer = await file.arrayBuffer()
  const { encryptedBlob, iv, keyMap } = await encryptFile(buffer, participants)

  // 2. Upload encrypted blob to Storage (content-type is always octet-stream)
  const fileId      = crypto.randomUUID()
  const storagePath = `encrypted/${conversationId}/${fileId}`
  const storageRef  = ref(storage, storagePath)

  await uploadBytes(storageRef, encryptedBlob, {
    contentType: 'application/octet-stream',
    customMetadata: { conversationId, uploadedBy: participants[0].uid },
  })

  // 3. Persist metadata in Firestore
  const encryptedPayload: Record<string, { encryptedKey: string; iv: string }> = {}
  for (const [uid, encryptedKey] of Object.entries(keyMap)) {
    encryptedPayload[uid] = { encryptedKey, iv }
  }

  const now = Date.now()
  const record: EncryptedFileRecord = {
    id: fileId,
    conversationId,
    uploadedBy: participants[0].uid,
    encryptedPayload,
    storagePath,
    mimeType: file.type,
    originalName: file.name,
    sizeBytes: file.size,
    createdAt: now,
    expiresAt: plan === 'free' ? now + FREE_TTL_MS : null,
  }

  await setDoc(doc(firestore, 'files', fileId), {
    ...record,
    createdAt: serverTimestamp(),
  })

  return fileId
}

/**
 * Downloads and decrypts a file, returning a local object URL for the browser.
 * Caller must revoke the URL after use: URL.revokeObjectURL(url)
 */
export async function downloadDecryptedFile(
  fileId: string,
  uid: string
): Promise<{ url: string; filename: string; mimeType: string } | null> {
  const snap = await getDoc(doc(firestore, 'files', fileId))
  if (!snap.exists()) return null

  const record = snap.data() as EncryptedFileRecord
  const slot   = record.encryptedPayload[uid]
  if (!slot) return null

  // Build a RecipientSlot-compatible shape — files store separate keys but same ciphertext is in Storage
  const privateKey = await getPrivateKey(uid)
  if (!privateKey) return null

  // Decrypt the AES key
  function fromBase64(b64: string): ArrayBuffer {
    const bin = atob(b64)
    const buf = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
    return buf.buffer
  }

  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    fromBase64(slot.encryptedKey)
  )
  const aesKey = await crypto.subtle.importKey(
    'raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']
  )

  // Fetch encrypted blob from Storage
  const downloadUrl  = await getDownloadURL(ref(storage, record.storagePath))
  const response     = await fetch(downloadUrl)
  const encryptedBuf = await response.arrayBuffer()

  // Decrypt blob
  const decryptedBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(slot.iv) },
    aesKey,
    encryptedBuf
  )

  const blob = new Blob([decryptedBuf], { type: record.mimeType })
  return {
    url:      URL.createObjectURL(blob),
    filename: record.originalName,
    mimeType: record.mimeType,
  }
}
