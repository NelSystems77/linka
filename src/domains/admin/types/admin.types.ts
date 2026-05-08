import type { UserRole, UserPlan, RenewalCycle } from '@/domains/users/types/user.types'

export interface AuditLogEntry {
  id: string
  actorUid: string
  action: AdminAction
  targetUid: string | null
  metadata: Record<string, unknown>
  createdAt: number
  ip: string
}

export type AdminAction =
  | 'user.create'
  | 'user.block'
  | 'user.unblock'
  | 'user.renew'
  | 'user.delete'
  | 'user.role_change'
  | 'user.password_reset'
  | 'admin.login'

export interface AdminCreateUserDTO {
  email: string
  displayName: string
  role: UserRole
  plan: UserPlan
  cycleMonths: RenewalCycle
  temporaryPassword: string
}
