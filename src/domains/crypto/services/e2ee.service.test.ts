// @vitest-environment node
// Node 18+ exposes globalThis.crypto (Web Crypto API) natively.
// Using node env avoids happy-dom's partial SubtleCrypto implementation.
import { describe, it, expect, vi, beforeAll } from 'vitest'

// vi.mock is hoisted before all imports — the factory runs first, so
// getPrivateKey from e2ee.service will already be the mocked version.
vi.mock('./keyManager.service', () => ({
  getPrivateKey: vi.fn(),
}))

import { encryptMessage, decryptMessage, encryptFile, type Participant } from './e2ee.service'
import { getPrivateKey } from './keyManager.service'

// ── Helpers ────────────────────────────────────────────────────────────────
// 2048-bit for test speed; production uses 4096-bit (same algorithm, same API)
const RSA_PARAMS: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

function toBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64')
}

// ── Fixtures ───────────────────────────────────────────────────────────────
let senderKP:    CryptoKeyPair
let recipientKP: CryptoKeyPair
let sender:    Participant
let recipient: Participant

beforeAll(async () => {
  ;[senderKP, recipientKP] = await Promise.all([
    crypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt']),
    crypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt']),
  ])

  const [senderSpki, recipientSpki] = await Promise.all([
    crypto.subtle.exportKey('spki', senderKP.publicKey).then(toBase64),
    crypto.subtle.exportKey('spki', recipientKP.publicKey).then(toBase64),
  ])

  sender    = { uid: 'uid-sender',    publicKeySpki: senderSpki }
  recipient = { uid: 'uid-recipient', publicKeySpki: recipientSpki }
})

// ── encryptMessage ─────────────────────────────────────────────────────────
describe('encryptMessage', () => {
  it('creates a slot for each participant', async () => {
    const payload = await encryptMessage('hello', [sender, recipient])
    expect(Object.keys(payload)).toEqual(expect.arrayContaining(['uid-sender', 'uid-recipient']))
  })

  it('each slot has encryptedKey, iv, and ciphertext strings', async () => {
    const payload = await encryptMessage('hello', [sender, recipient])
    for (const slot of Object.values(payload)) {
      expect(typeof slot.encryptedKey).toBe('string')
      expect(typeof slot.iv).toBe('string')
      expect(typeof slot.ciphertext).toBe('string')
      expect(slot.encryptedKey.length).toBeGreaterThan(0)
    }
  })

  it('ciphertext does not contain the plaintext', async () => {
    const plaintext = 'mensaje secreto'
    const payload   = await encryptMessage(plaintext, [sender])
    expect(payload['uid-sender']!.ciphertext).not.toContain(plaintext)
  })

  it('produces a different ciphertext on every call (random IV + AES key)', async () => {
    const [p1, p2] = await Promise.all([
      encryptMessage('same', [sender]),
      encryptMessage('same', [sender]),
    ])
    expect(p1['uid-sender']!.ciphertext).not.toBe(p2['uid-sender']!.ciphertext)
    expect(p1['uid-sender']!.iv).not.toBe(p2['uid-sender']!.iv)
  })

  it('sender and recipient get different encryptedKey values (different RSA keys)', async () => {
    const payload = await encryptMessage('hello', [sender, recipient])
    expect(payload['uid-sender']!.encryptedKey).not.toBe(payload['uid-recipient']!.encryptedKey)
  })

  it('works with a single participant', async () => {
    await expect(encryptMessage('solo', [sender])).resolves.toHaveProperty('uid-sender')
  })
})

// ── decryptMessage ─────────────────────────────────────────────────────────
describe('decryptMessage', () => {
  it('recipient decrypts their slot correctly', async () => {
    const plaintext = 'Mensaje cifrado para el destinatario 🔐'
    const payload   = await encryptMessage(plaintext, [sender, recipient])

    vi.mocked(getPrivateKey).mockResolvedValue(recipientKP.privateKey)
    const result = await decryptMessage(payload['uid-recipient']!, 'uid-recipient')
    expect(result).toBe(plaintext)
  })

  it('sender decrypts their own copy correctly', async () => {
    const plaintext = 'El remitente también puede releer sus mensajes'
    const payload   = await encryptMessage(plaintext, [sender, recipient])

    vi.mocked(getPrivateKey).mockResolvedValue(senderKP.privateKey)
    const result = await decryptMessage(payload['uid-sender']!, 'uid-sender')
    expect(result).toBe(plaintext)
  })

  it('returns null when private key is absent (different device)', async () => {
    const payload = await encryptMessage('hello', [sender, recipient])
    vi.mocked(getPrivateKey).mockResolvedValue(null)

    const result = await decryptMessage(payload['uid-recipient']!, 'uid-recipient')
    expect(result).toBeNull()
  })

  it('rejects when decrypting with the wrong private key', async () => {
    const payload = await encryptMessage('secreto', [sender, recipient])
    // Try to decrypt recipient slot using sender's private key → invalid
    vi.mocked(getPrivateKey).mockResolvedValue(senderKP.privateKey)

    await expect(
      decryptMessage(payload['uid-recipient']!, 'uid-recipient')
    ).rejects.toThrow()
  })

  it('preserves Unicode, emojis, and special characters verbatim', async () => {
    const plaintext = '¡Hola! 🚀 áéíóú ñ 中文 العربية'
    const payload   = await encryptMessage(plaintext, [recipient])

    vi.mocked(getPrivateKey).mockResolvedValue(recipientKP.privateKey)
    expect(await decryptMessage(payload['uid-recipient']!, 'uid-recipient')).toBe(plaintext)
  })

  it('handles a very long message (1 000 chars)', async () => {
    const plaintext = 'a'.repeat(1_000)
    const payload   = await encryptMessage(plaintext, [recipient])

    vi.mocked(getPrivateKey).mockResolvedValue(recipientKP.privateKey)
    expect(await decryptMessage(payload['uid-recipient']!, 'uid-recipient')).toBe(plaintext)
  })
})

// ── encryptFile ────────────────────────────────────────────────────────────
describe('encryptFile', () => {
  it('returns an encrypted Uint8Array, an iv string, and a keyMap', async () => {
    const buffer = new TextEncoder().encode('contenido de archivo simulado').buffer as ArrayBuffer
    const result = await encryptFile(buffer, [sender, recipient])

    expect(result.encryptedBlob).toBeInstanceOf(Uint8Array)
    expect(result.encryptedBlob.byteLength).toBeGreaterThan(0)
    expect(typeof result.iv).toBe('string')
    expect(result.keyMap['uid-sender']).toBeDefined()
    expect(result.keyMap['uid-recipient']).toBeDefined()
  })

  it('encrypted blob differs from the original buffer', async () => {
    const original = new TextEncoder().encode('dato original').buffer as ArrayBuffer
    const { encryptedBlob } = await encryptFile(original, [sender])

    const orig = new Uint8Array(original)
    const enc  = encryptedBlob
    // Buffers have the same length only if no padding; GCM adds a 16-byte tag
    // so lengths differ — but compare byte-by-byte for extra confidence
    const identical = orig.length === enc.length && orig.every((b, i) => b === enc[i])
    expect(identical).toBe(false)
  })
})
