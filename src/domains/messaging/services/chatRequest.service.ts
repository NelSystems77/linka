import {
  collection, addDoc, updateDoc, doc, onSnapshot, query, where
} from 'firebase/firestore'
import { firestore } from '@/core/config/firebase.config'
import type { ChatRequest, ChatRequestStatus } from '../types/chatRequest.types'

const COL = 'chatRequests'
const TTL_MS = 45_000

export async function sendChatRequest(
  fromUid: string,
  fromName: string,
  toUid: string
): Promise<string> {
  const now = Date.now()
  const ref = await addDoc(collection(firestore, COL), {
    fromUid,
    fromName,
    toUid,
    status: 'pending' as ChatRequestStatus,
    createdAt: now,
    expiresAt: now + TTL_MS,
  })
  return ref.id
}

export async function respondToChatRequest(
  requestId: string,
  status: 'accepted' | 'declined'
): Promise<void> {
  await updateDoc(doc(firestore, COL, requestId), { status })
}

export async function expireChatRequest(requestId: string): Promise<void> {
  await updateDoc(doc(firestore, COL, requestId), { status: 'expired' as ChatRequestStatus })
}

/** Real-time listener for pending incoming requests for a given user */
export function subscribeToIncomingRequests(
  uid: string,
  callback: (requests: ChatRequest[]) => void
): () => void {
  const q = query(
    collection(firestore, COL),
    where('toUid', '==', uid),
    where('status', '==', 'pending')
  )
  return onSnapshot(q, snap => {
    const now = Date.now()
    const requests = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as ChatRequest))
      .filter(r => r.expiresAt > now)
    callback(requests)
  })
}

/** Real-time listener for a specific sent request — watches for response */
export function subscribeToSentRequest(
  requestId: string,
  callback: (request: ChatRequest | null) => void
): () => void {
  return onSnapshot(doc(firestore, COL, requestId), snap => {
    if (!snap.exists()) { callback(null); return }
    callback({ id: snap.id, ...snap.data() } as ChatRequest)
  })
}
