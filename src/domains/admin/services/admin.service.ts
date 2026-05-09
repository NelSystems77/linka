import { auth } from '@/core/config/firebase.config'
import { env } from '@/core/config/env'
import type { AdminCreateUserDTO, AuditLogEntry } from '../types/admin.types'
import type { AppUser, RenewalCycle } from '@/domains/users/types/user.types'

const API = env.backend.apiUrl

async function authHeaders(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken(true)
  return {
    'Authorization':  `Bearer ${token ?? ''}`,
    'Content-Type':   'application/json',
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...init.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `Error ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const adminService = {
  listUsers:         ()                                          => apiFetch<AppUser[]>('/admin/users'),
  createUser:        (dto: AdminCreateUserDTO)                   => apiFetch<AppUser>('/admin/users', { method: 'POST', body: JSON.stringify(dto) }),
  blockUser:         (uid: string)                               => apiFetch<void>(`/admin/users/${uid}/block`,          { method: 'PATCH' }),
  unblockUser:       (uid: string)                               => apiFetch<void>(`/admin/users/${uid}/unblock`,        { method: 'PATCH' }),
  renewUser:         (uid: string, cycleMonths: RenewalCycle)    => apiFetch<{ expiresAt: number }>(`/admin/users/${uid}/renew`, { method: 'PATCH', body: JSON.stringify({ cycleMonths }) }),
  resetUserPassword: (uid: string, temporaryPassword: string)    => apiFetch<void>(`/admin/users/${uid}/reset-password`, { method: 'PATCH', body: JSON.stringify({ temporaryPassword }) }),
  deleteUser:        (uid: string)                               => apiFetch<void>(`/admin/users/${uid}`,                { method: 'DELETE' }),
  getAuditLog:       ()                                          => apiFetch<AuditLogEntry[]>('/admin/audit-log'),
  clearAuditLog:     (ids?: string[])                            => apiFetch<void>('/admin/audit-log', { method: 'DELETE', body: JSON.stringify(ids && ids.length > 0 ? { ids } : {}) }),
}
