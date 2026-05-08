import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageInput from './MessageInput'

function setup(overrides: Partial<React.ComponentProps<typeof MessageInput>> = {}) {
  const props = {
    onSendText: vi.fn().mockResolvedValue(undefined),
    onSendFile: vi.fn().mockResolvedValue(undefined),
    uploading:  false,
    ...overrides,
  }
  const utils = render(<MessageInput {...props} />)
  const textarea = screen.getByPlaceholderText(/escribe un mensaje/i)
  return { ...utils, ...props, textarea }
}

describe('MessageInput — text sending', () => {
  it('renders the textarea and send button', () => {
    setup()
    expect(screen.getByPlaceholderText(/escribe un mensaje/i)).toBeInTheDocument()
    expect(screen.getByTitle('Enviar')).toBeInTheDocument()
  })

  it('send button is disabled when textarea is empty', () => {
    setup()
    expect(screen.getByTitle('Enviar')).toBeDisabled()
  })

  it('send button becomes enabled when text is typed', async () => {
    const { textarea } = setup()
    await userEvent.type(textarea, 'hola')
    expect(screen.getByTitle('Enviar')).not.toBeDisabled()
  })

  it('calls onSendText with trimmed text when button is clicked', async () => {
    const { textarea, onSendText } = setup()
    await userEvent.type(textarea, '  Mensaje de prueba  ')
    await userEvent.click(screen.getByTitle('Enviar'))
    expect(onSendText).toHaveBeenCalledWith('Mensaje de prueba')
  })

  it('pressing Enter sends the message', async () => {
    const { textarea, onSendText } = setup()
    await userEvent.type(textarea, 'Hola')
    await userEvent.keyboard('{Enter}')
    expect(onSendText).toHaveBeenCalledWith('Hola')
  })

  it('pressing Shift+Enter does NOT send (inserts newline)', async () => {
    const { textarea, onSendText } = setup()
    await userEvent.type(textarea, 'Línea 1')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSendText).not.toHaveBeenCalled()
  })

  it('clears textarea after sending', async () => {
    const { textarea } = setup()
    await userEvent.type(textarea, 'Mensaje')
    await userEvent.click(screen.getByTitle('Enviar'))
    expect(textarea).toHaveValue('')
  })

  it('does NOT call onSendText when text is only whitespace', async () => {
    const { textarea, onSendText } = setup()
    await userEvent.type(textarea, '   ')
    await userEvent.click(screen.getByTitle('Enviar'))
    expect(onSendText).not.toHaveBeenCalled()
  })
})

describe('MessageInput — upload state', () => {
  it('disables inputs while uploading', () => {
    setup({ uploading: true })
    expect(screen.getByPlaceholderText(/subiendo archivo/i)).toBeDisabled()
    expect(screen.getByTitle('Enviar')).toBeDisabled()
  })

  it('shows "Subiendo archivo…" placeholder while uploading', () => {
    setup({ uploading: true })
    expect(screen.getByPlaceholderText(/subiendo archivo/i)).toBeInTheDocument()
  })
})

describe('MessageInput — file attach', () => {
  it('renders the attach button', () => {
    setup()
    expect(screen.getByTitle('Adjuntar archivo')).toBeInTheDocument()
  })

  it('attach button is disabled while uploading', () => {
    setup({ uploading: true })
    expect(screen.getByTitle('Adjuntar archivo')).toBeDisabled()
  })
})
