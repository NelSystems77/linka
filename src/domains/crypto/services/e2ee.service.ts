/**
 * E2EE Service — Web Crypto API (RSA-OAEP 4096 + AES-256-GCM)
 *
 * Flow (send):
 *   1. Generate ephemeral AES-256-GCM key
 *   2. Encrypt plaintext with AES key + random IV
 *   3. Encrypt AES key once per participant (sender + recipient) using RSA-OAEP
 *   4. Return MessageEncryptedPayload → stored as-is on the server
 *
 * Flow (receive):
 *   1. Decrypt your RecipientSlot.encryptedKey using your RSA private key
 *   2. Import recovered AES key
 *   3. Decrypt ciphertext with AES key + slot IV
 */

import { getPrivateKey } from './keyManager.service'
import type { MessageEncryptedPayload, RecipientSlot } from '../types/crypto.types'

// ─── helpers ────────────────────────────────────────────────────────────────

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

async function importRsaPublicKey(spkiBase64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'spki',
    fromBase64(spkiBase64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
}

async function encryptAesKeyForRecipient(
  aesKey: CryptoKey,
  recipientPublicKeyB64: string
): Promise<string> {
  const rsaPublicKey = await importRsaPublicKey(recipientPublicKeyB64)
  const rawAesKey    = await crypto.subtle.exportKey('raw', aesKey)
  const encrypted    = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsaPublicKey, rawAesKey)
  return toBase64(encrypted)
}

// ─── public API ─────────────────────────────────────────────────────────────

export interface Participant {
  uid: string
  publicKeySpki: string   // fetched from Firestore
}

/**
 * Encrypts a plaintext message for all participants.
 * The returned payload can be stored directly in Firestore — server never sees plaintext.
 */
export async function encryptMessage(
  plaintext: string,
  participants: Participant[]    // [sender, recipient]
): Promise<MessageEncryptedPayload> {
  // 1. Generate ephemeral AES-256-GCM key
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  // 2. Encrypt plaintext
  const iv         = crypto.getRandomValues(new Uint8Array(12))
  const encoded    = new TextEncoder().encode(plaintext)
  const cipherBuf  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded)

  const ivB64         = toBase64(iv.buffer)
  const ciphertextB64 = toBase64(cipherBuf)

  // 3. Encrypt AES key for each participant
  const payload: MessageEncryptedPayload = {}

  await Promise.all(
    participants.map(async ({ uid, publicKeySpki }) => {
      const encryptedKey = await encryptAesKeyForRecipient(aesKey, publicKeySpki)
      payload[uid] = { encryptedKey, iv: ivB64, ciphertext: ciphertextB64 }
    })
  )

  return payload
}

/**
 * Decrypts a message slot using the caller's private key from IndexedDB.
 * Returns null if key is unavailable (e.g. device mismatch).
 */
export async function decryptMessage(
  slot: RecipientSlot,
  uid: string
): Promise<string | null> {
  const privateKey = await getPrivateKey(uid)
  if (!privateKey) return null

  // 1. Decrypt AES key
  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    fromBase64(slot.encryptedKey)
  )

  // 2. Import AES key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  // 3. Decrypt ciphertext
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(slot.iv) },
    aesKey,
    fromBase64(slot.ciphertext)
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Encrypts a raw file buffer for all participants. Same pattern as encryptMessage.
 * Returns the encrypted blob (Uint8Array) + the per-recipient key map.
 */
export async function encryptFile(
  fileBuffer: ArrayBuffer,
  participants: Participant[]
): Promise<{ encryptedBlob: Uint8Array; iv: string; keyMap: Record<string, string> }> {
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  const iv        = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, fileBuffer)

  const keyMap: Record<string, string> = {}
  await Promise.all(
    participants.map(async ({ uid, publicKeySpki }) => {
      keyMap[uid] = await encryptAesKeyForRecipient(aesKey, publicKeySpki)
    })
  )

  return { encryptedBlob: new Uint8Array(encrypted), iv: toBase64(iv.buffer), keyMap }
}
