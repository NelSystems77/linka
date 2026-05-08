import { openDB, type IDBPDatabase } from 'idb'
import type { StoredKeyPair } from '../types/crypto.types'

const DB_NAME = 'linka_keystore'
const STORE   = 'keypairs'
const DB_VER  = 1

const RSA_PARAMS: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

async function db(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VER, {
    upgrade(database) {
      database.createObjectStore(STORE)
    },
  })
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

export async function generateAndStoreKeyPair(uid: string): Promise<string> {
  // extractable: true is required so we can exportKey('spki') the public half on all browsers.
  // The private key is never exported by our code — it stays in IndexedDB as an opaque CryptoKey.
  const keyPair = await crypto.subtle.generateKey(RSA_PARAMS, true, ['encrypt', 'decrypt'])

  const publicKeySpki = arrayBufferToBase64(
    await crypto.subtle.exportKey('spki', keyPair.publicKey)
  )

  const store = await db()
  await store.put(STORE, { privateKey: keyPair.privateKey, publicKeySpki }, uid)

  return publicKeySpki
}

export async function getPrivateKey(uid: string): Promise<CryptoKey | null> {
  const store = await db()
  const entry = await store.get(STORE, uid)
  return entry?.privateKey ?? null
}

export async function getStoredKeyPair(uid: string): Promise<StoredKeyPair | null> {
  const store = await db()
  const entry = await store.get(STORE, uid)
  if (!entry) return null
  return { privateKeyCryptoKey: entry.privateKey, publicKeySpki: entry.publicKeySpki }
}

export async function deleteKeyPair(uid: string): Promise<void> {
  const store = await db()
  await store.delete(STORE, uid)
}
