import { useState, useEffect, useCallback } from 'react'
import { subscribeToMessages, sendMessage, sendRoomMessage } from '../services/messaging.service'
import { decryptMessage } from '@/domains/crypto/services/e2ee.service'
import type { Message, DecryptedMessage, SendMessageInput, SendRoomMessageInput } from '../types/message.types'

export function useMessages(conversationId: string, uid: string, plan: 'free' | 'full') {
  const [messages, setMessages] = useState<DecryptedMessage[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!conversationId) return

    const unsub = subscribeToMessages(conversationId, async (raw: Message[]) => {
      const decrypted = await Promise.all(
        raw.map(async m => {
          if (m.type === 'system') {
            return {
              ...m,
              content: m.systemContent ?? '',
            } satisfies DecryptedMessage
          }
          const slot    = m.encryptedPayload[uid]
          const content = slot
            ? (await decryptMessage(slot, uid).catch(() => null)) ?? '[sin acceso]'
            : '[sin acceso]'
          return { ...m, content } satisfies DecryptedMessage
        })
      )
      setMessages(decrypted)
      setLoading(false)
    })

    return unsub
  }, [conversationId, uid])

  const send = useCallback(
    (input: Omit<SendMessageInput, 'conversationId'>) =>
      sendMessage({ ...input, conversationId }, plan),
    [conversationId, plan]
  )

  const sendRoom = useCallback(
    (input: Omit<SendRoomMessageInput, 'conversationId'>) =>
      sendRoomMessage({ ...input, conversationId }, plan),
    [conversationId, plan]
  )

  return { messages, loading, send, sendRoom }
}
