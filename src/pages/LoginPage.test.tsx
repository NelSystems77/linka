import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import type { AppUser } from '@/domains/users/types/user.types'

// ── Mocks ──────────────────────────────────────────────────────────────────
// vi.mock is hoisted — factories must be self-contained (no outer-scope refs).
vi.mock('@/domains/auth/services/auth.service', () => ({
  signIn: vi.fn(),
}))

// The store mock captures setUser via a module-level spy that is always stable.
// We expose it through the module so tests can assert on it.
const mockSetUser = vi.fn()
vi.mock('@/domains/auth/store/auth.store', () => ({
  // Zustand store: LoginPage calls useAuthStore(s => s.setUser)
  useAuthStore: (selector: (s: { setUser: () => void }) => unknown) =>
    selector({ setUser: mockSetUser }),
}))

import { signIn } from '@/domains/auth/services/auth.service'

const MOCK_USER = {
  uid: 'uid-1', displayName: 'Test', role: 'user', plan: 'full',
} as AppUser

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Layout ─────────────────────────────────────────────────────────────────
describe('LoginPage — layout', () => {
  it('renders the Linka title', () => {
    renderLogin()
    expect(screen.getByText('Linka')).toBeInTheDocument()
  })

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
  })

  it('renders the submit button in idle state', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /ingresar/i })).toBeInTheDocument()
  })

  it('shows E2EE subtitle', () => {
    renderLogin()
    expect(screen.getByText(/e2ee/i)).toBeInTheDocument()
  })
})

// ── Happy path ─────────────────────────────────────────────────────────────
describe('LoginPage — successful login', () => {
  it('calls signIn with the typed credentials', async () => {
    vi.mocked(signIn).mockResolvedValue(MOCK_USER)
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'),      'test@linka.app')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(signIn).toHaveBeenCalledWith({
      email:    'test@linka.app',
      password: 'password123',
    })
  })

  it('calls setUser with the returned user on success', async () => {
    vi.mocked(signIn).mockResolvedValue(MOCK_USER)
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'),      'test@linka.app')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'pass')
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => expect(mockSetUser).toHaveBeenCalledWith(MOCK_USER))
  })

  it('shows a loading label and disables the button while signing in', async () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => {}))   // never resolves
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'),      'a@b.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'pass')
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    expect(screen.getByRole('button', { name: /iniciando sesión/i })).toBeDisabled()
  })
})

// ── Error handling ─────────────────────────────────────────────────────────
describe('LoginPage — error handling', () => {
  it('displays the error message from the thrown Error', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('Cuenta expirada o bloqueada.'))
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'),      'blocked@linka.app')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByText('Cuenta expirada o bloqueada.')).toBeInTheDocument()
    })
  })

  it('re-enables the button after a failed attempt', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('Error'))
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'),      'a@b.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'pass')
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ingresar/i })).not.toBeDisabled()
    })
  })

  it('clears the error message on the next submit attempt', async () => {
    vi.mocked(signIn)
      .mockRejectedValueOnce(new Error('Error inicial'))
      .mockResolvedValueOnce(MOCK_USER)
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'),      'a@b.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'pass')
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))
    await waitFor(() => screen.getByText('Error inicial'))

    // Second attempt clears the error before signIn resolves
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))
    await waitFor(() => {
      expect(screen.queryByText('Error inicial')).not.toBeInTheDocument()
    })
  })

  it('shows a fallback message when the error is not an Error instance', async () => {
    vi.mocked(signIn).mockRejectedValue('string error')
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'),      'a@b.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'pass')
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByText('Error al iniciar sesión.')).toBeInTheDocument()
    })
  })
})
