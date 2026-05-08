import { useState, useCallback } from 'react'
import { uploadEncryptedFile, downloadDecryptedFile } from '../services/files.service'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, type FileValidationError } from '../types/file.types'
import type { Participant } from '@/domains/crypto/services/e2ee.service'

export function useFileUpload() {
  const [uploading,   setUploading]   = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)  // fileId being downloaded

  function validateFile(file: File): FileValidationError | null {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { type: 'size', message: `El archivo supera el límite de 50 MB.` }
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      return { type: 'mime', message: `Tipo de archivo no permitido: ${file.type}` }
    }
    return null
  }

  const upload = useCallback(async (
    file: File,
    conversationId: string,
    participants: Participant[],
    plan: 'free' | 'full'
  ): Promise<string | null> => {
    const err = validateFile(file)
    if (err) { alert(err.message); return null }

    setUploading(true)
    try {
      return await uploadEncryptedFile(file, conversationId, participants, plan)
    } finally {
      setUploading(false)
    }
  }, [])

  const download = useCallback(async (fileId: string, uid: string): Promise<void> => {
    setDownloading(fileId)
    try {
      const result = await downloadDecryptedFile(fileId, uid)
      if (!result) { alert('No se pudo descargar el archivo.'); return }

      const a = document.createElement('a')
      a.href = result.url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(result.url)
    } finally {
      setDownloading(null)
    }
  }, [])

  return { upload, download, uploading, downloading, validateFile }
}
