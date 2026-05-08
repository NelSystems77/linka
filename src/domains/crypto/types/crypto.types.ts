export interface EncryptedBundle {
  /** Base64: AES-256-GCM ciphertext */
  ciphertext: string
  /** Base64: 12-byte IV for AES-GCM */
  iv: string
}

/** Per-recipient slot inside a message */
export interface RecipientSlot extends EncryptedBundle {
  /** Base64: the AES key encrypted with the recipient's RSA-OAEP public key */
  encryptedKey: string
}

/** What the server stores — one slot per participant (sender + recipient) */
export type MessageEncryptedPayload = Record<string, RecipientSlot>

export interface StoredKeyPair {
  publicKeySpki: string   // Base64 SPKI — sent to server
  privateKeyCryptoKey: CryptoKey  // Non-extractable, lives in IndexedDB
}

export type KeyAlgorithm = {
  name: 'RSA-OAEP'
  modulusLength: 4096
  publicExponent: Uint8Array
  hash: 'SHA-256'
}
