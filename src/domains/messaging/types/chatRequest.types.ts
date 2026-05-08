export type ChatRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface ChatRequest {
  id: string
  fromUid: string
  fromName: string
  toUid: string
  status: ChatRequestStatus
  createdAt: number
  expiresAt: number
}
