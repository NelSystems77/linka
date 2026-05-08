import {
  collection, addDoc, updateDoc, doc, deleteDoc,
  arrayRemove, getDocs, query, where, serverTimestamp
} from 'firebase/firestore'
import { firestore } from '@/core/config/firebase.config'

const CONV_COL = 'conversations'
const MSG_COL  = 'messages'

export async function createRoom(
  createdBy: string,
  name: string,
  participants: string[]
): Promise<string> {
  const ref = await addDoc(collection(firestore, CONV_COL), {
    type: 'room',
    name,
    participants,
    createdBy,
    createdAt:     serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  })
  return ref.id
}

export async function leaveRoom(
  roomId: string,
  uid: string,
  displayName: string,
  plan: 'free' | 'full'
): Promise<void> {
  await updateDoc(doc(firestore, CONV_COL, roomId), {
    participants: arrayRemove(uid),
  })

  // Only free plan users emit a visible system message on leave
  if (plan === 'free') {
    await addDoc(collection(firestore, MSG_COL), {
      conversationId: roomId,
      senderId:       uid,
      type:           'system',
      encryptedPayload: {},
      systemContent:  `${displayName} abandonó la sala`,
      fileRef:        null,
      createdAt:      serverTimestamp(),
      expiresAt:      null,
    })
  }
}

export async function dissolveRoom(roomId: string): Promise<void> {
  const msgsSnap = await getDocs(
    query(collection(firestore, MSG_COL), where('conversationId', '==', roomId))
  )
  await Promise.all(msgsSnap.docs.map(d => deleteDoc(d.ref)))
  await deleteDoc(doc(firestore, CONV_COL, roomId))
}
