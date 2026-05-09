import type { MessageEncryptedPayload } from '@/domains/crypto/types/crypto.types'

export type MessageType = 'text' | 'file' | 'system'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  encryptedPayload: MessageEncryptedPayload
  type: MessageType
  /** Populated only when type === 'file' */
  fileRef: string | null
  createdAt: number
  /** null = full plan (no TTL). Free plan: createdAt + 86_400_000 (24 h) */
  expiresAt: number | null
  /** Plaintext notification — only when type === 'system' */
  systemContent?: string
}

export interface DecryptedMessage {
  id: string
  conversationId: string
  senderId: string
  content: string     // decrypted on the client only
  type: MessageType
  fileRef: string | null
  createdAt: number
  expiresAt: number | null
  systemContent?: string
}

export interface Conversation {
  id: string
  type: 'direct' | 'room'
  participants: string[]
  createdAt: number
  lastMessageAt: number
  /** Last message preview text (decrypted snippet or system text) */
  lastMessage?: string
  /** UID of the sender of the last message */
  lastMessageSenderId?: string
  /** Type of the last message */
  lastMessageType?: MessageType
  /** Room only */
  name?: string
  createdBy?: string
  /** Unread message count per participant uid */
  unreadCounts?: Record<string, number>
}

export interface SendMessageInput {
  conversationId: string
  senderId: string
  recipientId: string
  plaintext: string
  type?: MessageType
  fileRef?: string
}

export interface SendRoomMessageInput {
  conversationId: string
  senderId: string
  participantUids: string[]
  plaintext: string
  type?: MessageType
  fileRef?: string
}
