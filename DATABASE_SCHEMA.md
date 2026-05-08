# Linka — Firestore NoSQL Schema

> All message/file content stored on the server is an **encrypted blob**.
> The server never holds plaintext. Private keys exist only in the client's IndexedDB.

---

## Collection: `users/{uid}`

```ts
{
  uid:            string,           // Firebase Auth UID
  email:          string,
  displayName:    string,
  avatarUrl:      string | null,
  role:           'super_admin' | 'admin' | 'user',
  plan:           'free' | 'full',
  publicKey:      string,           // Base64 SPKI (RSA-OAEP 4096) — public only
  createdAt:      number,           // unix ms
  expiresAt:      number | null,    // null = no expiry (super_admin). Block if Date.now() > expiresAt
  renewalHistory: [
    {
      renewedAt:   number,          // unix ms
      cycleMonths: 3 | 6 | 9 | 12,
      renewedBy:   string           // uid of admin who performed renewal
    }
  ],
  isBlocked:      boolean,
  lastSeenAt:     number
}
```

**Access rules**
- Any active user can read (needed to fetch public keys).
- Only `super_admin` can create/delete.
- `admin` can update non-role fields.
- User can only update their own `lastSeenAt`.

---

## Collection: `conversations/{conversationId}`

```ts
{
  id:            string,
  type:          'direct',
  participants:  [string, string],  // sorted UIDs — used as compound index
  createdAt:     number,
  lastMessageAt: number,
  // NO plaintext preview — ever
}
```

**Index**: `participants ASC, lastMessageAt DESC`

---

## Collection: `messages/{messageId}`

```ts
{
  id:             string,
  conversationId: string,
  senderId:       string,

  // One slot per participant (sender stores their own copy to re-read their messages)
  encryptedPayload: {
    [uid: string]: {
      encryptedKey: string,   // Base64: AES-256 key encrypted with recipient RSA-OAEP public key
      iv:           string,   // Base64: 12-byte AES-GCM IV
      ciphertext:   string    // Base64: AES-GCM encrypted message body
    }
  },

  type:      'text' | 'file',
  fileRef:   string | null,   // → /files/{fileId}
  createdAt: number,
  expiresAt: number | null,   // null = full plan. Free: createdAt + 86_400_000 (24 h TTL)
}
```

**Indexes**: `conversationId ASC, createdAt ASC`

**TTL deletion**: Cloud Function triggered on `expiresAt < now()` deletes the document.

**Security invariants**:
- Messages are **immutable** once written (Firestore rules deny update/delete).
- Only conversation participants can read.

---

## Collection: `files/{fileId}`

```ts
{
  id:            string,
  conversationId: string,
  uploadedBy:    string,

  // Per-recipient AES key slots (same pattern as messages)
  encryptedPayload: {
    [uid: string]: {
      encryptedKey: string,
      iv:           string
    }
  },

  storagePath:   string,        // Firebase Storage path — blob is AES-GCM encrypted
  mimeType:      string,        // 'application/pdf' | 'image/png' | etc.
  originalName:  string,        // filename (NOT encrypted — low sensitivity)
  sizeBytes:     number,
  createdAt:     number,
  expiresAt:     number | null
}
```

**Storage**: encrypted blobs live at `gs://<bucket>/encrypted/<conversationId>/<fileId>`.
No plaintext file is ever uploaded.

---

## Collection: `auditLog/{logId}`

```ts
{
  id:        string,
  actorUid:  string,
  action:    'user.create' | 'user.block' | 'user.renew' | 'user.delete' | 'user.role_change' | 'admin.login',
  targetUid: string | null,
  metadata:  Record<string, unknown>,
  createdAt: number,
  ip:        string
}
```

Written **exclusively** by the backend (Firebase Admin SDK).
Only `super_admin` can read via Firestore rules.

---

## E2EE Encryption Flow

```
SEND MESSAGE
─────────────────────────────────────────────────────────────────
Client (Sender)

  1. Generate ephemeral AES-256-GCM key  K_aes
  2. Generate random 12-byte IV
  3. ciphertext = AES-GCM.encrypt(plaintext, K_aes, IV)
  4. For each participant P in [sender, recipient]:
       encryptedKey[P.uid] = RSA-OAEP.encrypt(K_aes.raw, P.publicKey)
  5. Store to Firestore:
       { encryptedPayload: { [uid]: { encryptedKey, iv, ciphertext } } }

Server (Firestore)
  ← Receives only opaque Base64 blobs. No plaintext ever.

─────────────────────────────────────────────────────────────────
RECEIVE MESSAGE
─────────────────────────────────────────────────────────────────
Client (Recipient)

  1. Fetch message doc from Firestore
  2. slot = message.encryptedPayload[myUid]
  3. K_aes.raw = RSA-OAEP.decrypt(slot.encryptedKey, myPrivateKey)  ← IndexedDB
  4. K_aes = importKey(K_aes.raw, 'AES-GCM')
  5. plaintext = AES-GCM.decrypt(slot.ciphertext, K_aes, slot.iv)
  6. Render in UI

Private key never leaves the device. Super Admin cannot decrypt. ✓
─────────────────────────────────────────────────────────────────
```

---

## Role & Expiry Logic

| Role        | expiresAt | Can create Admins | Can create Users | Access expiry check |
|-------------|-----------|-------------------|------------------|---------------------|
| super_admin | `null`    | ✓                 | ✓                | Never expires        |
| admin       | Required  | ✗                 | ✓                | `Date.now() > expiresAt` → block |
| user        | Required  | ✗                 | ✗                | `Date.now() > expiresAt` → block |

Renewal cycles: **3 / 6 / 9 / 12 months**
New `expiresAt = max(currentExpiresAt, now) + cycleMonths * 30 * 24 * 60 * 60 * 1000`
