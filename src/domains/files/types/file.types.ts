export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  // 50 MB

export interface EncryptedFileRecord {
  id: string
  conversationId: string
  uploadedBy: string
  encryptedPayload: Record<string, { encryptedKey: string; iv: string }>
  storagePath: string
  mimeType: string
  originalName: string
  sizeBytes: number
  createdAt: number
  expiresAt: number | null
}

export interface FileValidationError {
  type: 'size' | 'mime'
  message: string
}
