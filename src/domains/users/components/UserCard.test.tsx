import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserCard from './UserCard'
import type { AppUser } from '../types/user.types'

const BASE_USER: AppUser = {
  uid:                'uid-001',
  email:              'carlos@empresa.com',
  displayName:        'Carlos Martínez',
  avatarUrl:          null,
  role:               'user',
  plan:               'full',
  publicKey:          'spki-base64',
  createdAt:          Date.now() - 86_400_000,
  expiresAt:          Date.now() + 30 * 86_400_000,
  renewalHistory:     [],
  isBlocked:          false,
  lastSeenAt:         Date.now(),
  mustChangePassword: false,
  status:             'available',
}

describe('UserCard', () => {
  it('renders the user display name', () => {
    render(<UserCard user={BASE_USER} isActive={false} isOnline={false} onClick={vi.fn()} />)
    expect(screen.getByText('Carlos Martínez')).toBeInTheDocument()
  })

  it('shows initials avatar when no avatarUrl', () => {
    render(<UserCard user={BASE_USER} isActive={false} isOnline={false} onClick={vi.fn()} />)
    expect(screen.getByText('CM')).toBeInTheDocument()
  })

  it('shows img when avatarUrl is set', () => {
    const user = { ...BASE_USER, avatarUrl: 'https://example.com/avatar.jpg' }
    render(<UserCard user={user} isActive={false} isOnline={false} onClick={vi.fn()} />)
    expect(screen.getByRole('img', { name: /carlos/i })).toBeInTheDocument()
  })

  it('shows green online indicator when online', () => {
    const { container } = render(
      <UserCard user={BASE_USER} isActive={false} isOnline={true} onClick={vi.fn()} />
    )
    expect(container.querySelector('.bg-green-400')).toBeInTheDocument()
  })

  it('shows grey offline indicator when offline', () => {
    const { container } = render(
      <UserCard user={BASE_USER} isActive={false} isOnline={false} onClick={vi.fn()} />
    )
    expect(container.querySelector('.bg-slate-600')).toBeInTheDocument()
  })

  it('applies active styles when isActive is true', () => {
    const { container } = render(
      <UserCard user={BASE_USER} isActive={true} isOnline={false} onClick={vi.fn()} />
    )
    expect(container.firstChild).toHaveClass('bg-brand-600/20')
  })

  it('calls onClick when card is clicked', async () => {
    const onClick = vi.fn()
    render(<UserCard user={BASE_USER} isActive={false} isOnline={false} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows plan and role in subtitle', () => {
    render(<UserCard user={BASE_USER} isActive={false} isOnline={false} onClick={vi.fn()} />)
    expect(screen.getByText(/full/i)).toBeInTheDocument()
    expect(screen.getByText(/user/i)).toBeInTheDocument()
  })

  it('single initial when displayName has one word', () => {
    const user = { ...BASE_USER, displayName: 'Nelson' }
    render(<UserCard user={user} isActive={false} isOnline={false} onClick={vi.fn()} />)
    expect(screen.getByText('N')).toBeInTheDocument()
  })
})
