import {
  collection, doc, addDoc, query,
  where, orderBy, onSnapshot, updateDoc,
  serverTimestamp, Timestamp, getDocs
} from 'firebase/firestore'
import { firestore } from '@/core/config/firebase.config'
import { encryptMessage, type Participant } from '@/domains/crypto/services/e2ee.service'
import { getPublicKey } from '@/domains/users/services/users.service'
import type { Message, SendMessageInput, SendRoomMessageInput } from '../types/message.types'

const FREE_TTL_MS = 24 * 60 * 60 * 1000   // 24 hours

async function resolveParticipants(senderUid: string, recipientUid: string): Promise<Participant[]> {
  const [senderKey, recipientKey] = await Promise.all([
    getPublicKey(senderUid),
    getPublicKey(recipientUid),
  ])
  if (!senderKey || !recipientKey) throw new Error('Public key not found for one or more participants')
  return [
    { uid: senderUid,    publicKeySpki: senderKey },
    { uid: recipientUid, publicKeySpki: recipientKey },
  ]
}

export async function getOrCreateConversation(
  uid1: string,
  uid2: string
): Promise<string> {
  const sorted = [uid1, uid2].sort()
  const snap = await getDocs(
    query(
      collection(firestore, 'conversations'),
      where('participants', '==', sorted)
    )
  )
  if (!snap.empty) return snap.docs[0].id

  const ref = await addDoc(collection(firestore, 'conversations'), {
    type: 'direct',
    participants: sorted,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  })
  return ref.id
}

export async function sendMessage(
  input: SendMessageInput,
  senderPlan: 'free' | 'full'
): Promise<void> {
  const participants = await resolveParticipants(input.senderId, input.recipientId)
  const encryptedPayload = await encryptMessage(input.plaintext, participants)

  const now       = Date.now()
  const expiresAt = senderPlan === 'free' ? now + FREE_TTL_MS : null

  await addDoc(collection(firestore, 'messages'), {
    conversationId:   input.conversationId,
    senderId:         input.senderId,
    encryptedPayload,
    type:             input.type ?? 'text',
    fileRef:          input.fileRef ?? null,
    createdAt:        serverTimestamp(),
    expiresAt,
  })

  await updateDoc(doc(firestore, 'conversations', input.conversationId), {
    lastMessageAt: serverTimestamp(),
  })
}

export async function sendRoomMessage(
  input: SendRoomMessageInput,
  senderPlan: 'free' | 'full'
): Promise<void> {
  const keys = await Promise.all(input.participantUids.map(uid => getPublicKey(uid)))
  const participants: Participant[] = input.participantUids
    .map((uid, i) => ({ uid, publicKeySpki: keys[i] }))
    .filter((p): p is Participant => p.publicKeySpki !== null)

  if (participants.length === 0) throw new Error('No participant public keys found')

  const encryptedPayload = await encryptMessage(input.plaintext, participants)
  const now       = Date.now()
  const expiresAt = senderPlan === 'free' ? now + FREE_TTL_MS : null

  await addDoc(collection(firestore, 'messages'), {
    conversationId:   input.conversationId,
    senderId:         input.senderId,
    encryptedPayload,
    type:             input.type ?? 'text',
    fileRef:          input.fileRef ?? null,
    createdAt:        serverTimestamp(),
    expiresAt,
  })

  await updateDoc(doc(firestore, 'conversations', input.conversationId), {
    lastMessageAt: serverTimestamp(),
  })
}

/**
 * Real-time subscription to messages in a conversation.
 * Returns raw encrypted messages — decryption happens in the hook/component layer.
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): () => void {
  const now = Timestamp.now()

  const q = query(
    collection(firestore, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  )

  return onSnapshot(q, snap => {
    const msgs: Message[] = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Message))
      .filter(m => m.expiresAt === null || m.expiresAt > now.toMillis())
    callback(msgs)
  })
}
