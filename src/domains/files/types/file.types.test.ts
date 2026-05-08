import { describe, it, expect } from 'vitest'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './file.types'

describe('File type constants', () => {
  it('allows PDF files', () => {
    expect(ALLOWED_MIME_TYPES).toContain('application/pdf')
  })

  it('allows DOCX files', () => {
    expect(ALLOWED_MIME_TYPES).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  })

  it('allows XLSX files', () => {
    expect(ALLOWED_MIME_TYPES).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  })

  it('allows CSV files', () => {
    expect(ALLOWED_MIME_TYPES).toContain('text/csv')
  })

  it('allows common image formats', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg')
    expect(ALLOWED_MIME_TYPES).toContain('image/png')
    expect(ALLOWED_MIME_TYPES).toContain('image/webp')
    expect(ALLOWED_MIME_TYPES).toContain('image/gif')
  })

  it('does NOT allow executable files', () => {
    expect(ALLOWED_MIME_TYPES).not.toContain('application/x-msdownload')
    expect(ALLOWED_MIME_TYPES).not.toContain('application/octet-stream')
    expect(ALLOWED_MIME_TYPES).not.toContain('text/javascript')
  })

  it('does NOT allow ZIP or RAR archives', () => {
    expect(ALLOWED_MIME_TYPES).not.toContain('application/zip')
    expect(ALLOWED_MIME_TYPES).not.toContain('application/x-rar-compressed')
  })

  it('max file size is exactly 50 MB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024)
  })

  it('max file size is 52_428_800 bytes', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(52_428_800)
  })
})
