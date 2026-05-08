import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageBubble from './MessageBubble'
import type { DecryptedMessage } from '../types/message.types'

function makeMsg(overrides: Partial<DecryptedMessage> = {}): DecryptedMessage {
  return {
    id:             'msg-1',
    conversationId: 'conv-1',
    senderId:       'uid-sender',
    content:        'Hola mundo',
    type:           'text',
    fileRef:        null,
    createdAt:      new Date('2025-01-15T14:30:00').getTime(),
    expiresAt:      null,
    ...overrides,
  }
}

describe('MessageBubble — text messages', () => {
  it('renders the message content', () => {
    render(<MessageBubble message={makeMsg()} isMine={true} />)
    expect(screen.getByText('Hola mundo')).toBeInTheDocument()
  })

  it('applies right-align style for own messages', () => {
    const { container } = render(<MessageBubble message={makeMsg()} isMine={true} />)
    expect(container.firstChild).toHaveClass('justify-end')
  })

  it('applies left-align style for others messages', () => {
    const { container } = render(<MessageBubble message={makeMsg()} isMine={false} />)
    expect(container.firstChild).toHaveClass('justify-start')
  })

  it('shows formatted time (HH:mm)', () => {
    render(<MessageBubble message={makeMsg()} isMine={false} />)
    expect(screen.getByText('14:30')).toBeInTheDocument()
  })

  it('shows TTL icon ⏱ when message has expiresAt', () => {
    const msg = makeMsg({ expiresAt: Date.now() + 3_600_000 })
    render(<MessageBubble message={msg} isMine={false} />)
    expect(screen.getByTitle(/temporal/i)).toBeInTheDocument()
  })

  it('does NOT show TTL icon when expiresAt is null (full plan)', () => {
    render(<MessageBubble message={makeMsg({ expiresAt: null })} isMine={false} />)
    expect(screen.queryByTitle(/temporal/i)).not.toBeInTheDocument()
  })
})

describe('MessageBubble — file messages', () => {
  it('renders a download button for file messages', () => {
    const msg = makeMsg({ type: 'file', fileRef: 'file-123', content: 'image/jpeg|foto.jpg' })
    render(<MessageBubble message={msg} isMine={false} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('displays only the filename, not the MIME type prefix', () => {
    const msg = makeMsg({ type: 'file', fileRef: 'file-1', content: 'application/pdf|reporte-final.pdf' })
    render(<MessageBubble message={msg} isMine={false} onDownloadFile={vi.fn()} />)
    expect(screen.getByText('reporte-final.pdf')).toBeInTheDocument()
    expect(screen.queryByText(/application\/pdf/)).not.toBeInTheDocument()
  })

  it('calls onDownloadFile with the fileRef when clicked', async () => {
    const onDownload = vi.fn()
    const msg = makeMsg({ type: 'file', fileRef: 'file-abc', content: 'application/pdf|reporte.pdf' })

    render(<MessageBubble message={msg} isMine={false} onDownloadFile={onDownload} />)

    await userEvent.click(screen.getByRole('button'))
    expect(onDownload).toHaveBeenCalledWith('file-abc')
  })

  it('shows "Descargando…" when this file is being downloaded', () => {
    const msg = makeMsg({ type: 'file', fileRef: 'file-abc', content: 'application/pdf|doc.pdf' })
    render(
      <MessageBubble message={msg} isMine={false} onDownloadFile={vi.fn()} downloadingFileId="file-abc" />
    )
    expect(screen.getByText('Descargando…')).toBeInTheDocument()
  })

  it('hides the filename and shows "Descargando…" while downloading', () => {
    const msg = makeMsg({ type: 'file', fileRef: 'file-abc', content: 'text/csv|datos.csv' })
    render(
      <MessageBubble message={msg} isMine={false} onDownloadFile={vi.fn()} downloadingFileId="file-abc" />
    )
    expect(screen.queryByText('datos.csv')).not.toBeInTheDocument()
    expect(screen.getByText('Descargando…')).toBeInTheDocument()
  })

  it('download button is disabled while downloading', () => {
    const msg = makeMsg({ type: 'file', fileRef: 'file-xyz', content: 'text/csv|data.csv' })
    render(
      <MessageBubble message={msg} isMine={false} onDownloadFile={vi.fn()} downloadingFileId="file-xyz" />
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows the correct emoji icon for PDF files', () => {
    const msg = makeMsg({ type: 'file', fileRef: 'f1', content: 'application/pdf|doc.pdf' })
    render(<MessageBubble message={msg} isMine={false} onDownloadFile={vi.fn()} />)
    expect(screen.getByText('📄')).toBeInTheDocument()
  })

  it('shows image emoji for image files', () => {
    const msg = makeMsg({ type: 'file', fileRef: 'f2', content: 'image/png|foto.png' })
    render(<MessageBubble message={msg} isMine={false} onDownloadFile={vi.fn()} />)
    expect(screen.getByText('🖼️')).toBeInTheDocument()
  })
})
