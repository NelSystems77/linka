import { useState, useEffect, useCallback } from 'react'
import { adminService } from '../services/admin.service'
import type { AdminCreateUserDTO, AuditLogEntry } from '../types/admin.types'
import type { AppUser, RenewalCycle } from '@/domains/users/types/user.types'

export function useAdmin() {
  const [users,      setUsers]      = useState<AppUser[]>([])
  const [auditLog,   setAuditLog]   = useState<AuditLogEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.listUsers()
      setUsers(data.sort((a, b) => a.displayName.localeCompare(b.displayName)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAuditLog = useCallback(async () => {
    try {
      const data = await adminService.getAuditLog()
      setAuditLog(data)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    loadUsers()
    loadAuditLog()
  }, [loadUsers, loadAuditLog])

  async function withSubmit(fn: () => Promise<void>) {
    setSubmitting(true)
    setError(null)
    try {
      await fn()
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      throw e
    } finally {
      setSubmitting(false)
    }
  }

  const createUser        = (dto: AdminCreateUserDTO)                      => withSubmit(() => adminService.createUser(dto).then(() => void 0))
  const blockUser         = (uid: string)                                  => withSubmit(() => adminService.blockUser(uid))
  const unblockUser       = (uid: string)                                  => withSubmit(() => adminService.unblockUser(uid))
  const deleteUser        = (uid: string)                                  => withSubmit(() => adminService.deleteUser(uid))
  const resetUserPassword = (uid: string, temporaryPassword: string)       => withSubmit(async () => {
    await adminService.resetUserPassword(uid, temporaryPassword)
    await loadAuditLog()
  })
  const renewUser         = (uid: string, cycle: RenewalCycle)             => withSubmit(async () => {
    await adminService.renewUser(uid, cycle)
    await loadAuditLog()
  })
  const clearAuditLog     = useCallback(async () => {
    setSubmitting(true)
    setError(null)
    try {
      await adminService.clearAuditLog()
      setAuditLog([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al borrar el registro')
    } finally {
      setSubmitting(false)
    }
  }, [])

  const stats = {
    total:   users.length,
    active:  users.filter(u => !u.isBlocked && (u.expiresAt === null || u.expiresAt > Date.now())).length,
    expired: users.filter(u => !u.isBlocked && u.expiresAt !== null && u.expiresAt <= Date.now()).length,
    blocked: users.filter(u => u.isBlocked).length,
  }

  return {
    users, auditLog, stats,
    loading, submitting, error,
    createUser, blockUser, unblockUser, renewUser, deleteUser, resetUserPassword,
    clearAuditLog,
    reload: loadUsers,
  }
}
