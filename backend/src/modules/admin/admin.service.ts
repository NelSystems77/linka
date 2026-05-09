import { Injectable, NotFoundException } from '@nestjs/common'
import { FieldValue } from 'firebase-admin/firestore'
import { FirebaseService } from '../../firebase/firebase.service'
import type { CreateUserDto } from './dto/create-user.dto'
import type { RenewUserDto } from './dto/renew-user.dto'

const USERS     = 'users'
const AUDIT_LOG = 'auditLog'

@Injectable()
export class AdminService {
  constructor(private readonly firebase: FirebaseService) {}

  // ── Users ────────────────────────────────────────────────────────────────

  async listUsers() {
    const snap = await this.firebase.firestore.collection(USERS).get()
    return snap.docs.map(d => d.data())
  }

  async createUser(dto: CreateUserDto, actorUid: string) {
    const fbUser = await this.firebase.auth.createUser({
      email:       dto.email,
      password:    dto.temporaryPassword,
      displayName: dto.displayName,
    })

    await this.firebase.auth.setCustomUserClaims(fbUser.uid, { role: dto.role })

    const cycleMs   = dto.cycleMonths * 30 * 24 * 60 * 60 * 1000
    const expiresAt = dto.role === 'admin' ? Date.now() + cycleMs : Date.now() + cycleMs
    const now       = Date.now()

    const userData = {
      uid:                fbUser.uid,
      email:              dto.email,
      displayName:        dto.displayName,
      avatarUrl:          null,
      role:               dto.role,
      plan:               dto.plan,
      publicKey:          '',
      createdAt:          now,
      expiresAt,
      renewalHistory:     [{ renewedAt: now, cycleMonths: dto.cycleMonths, renewedBy: actorUid }],
      isBlocked:          false,
      lastSeenAt:         now,
      mustChangePassword: true,
      status:             'offline',
    }

    await this.firebase.firestore.collection(USERS).doc(fbUser.uid).set(userData)
    await this.audit('user.create', actorUid, fbUser.uid, { role: dto.role, plan: dto.plan })

    return userData
  }

  async blockUser(uid: string, actorUid: string) {
    await this.assertUserExists(uid)
    await Promise.all([
      this.firebase.firestore.collection(USERS).doc(uid).update({ isBlocked: true }),
      this.firebase.auth.revokeRefreshTokens(uid),
    ])
    await this.audit('user.block', actorUid, uid, {})
  }

  async unblockUser(uid: string, actorUid: string) {
    await this.assertUserExists(uid)
    await this.firebase.firestore.collection(USERS).doc(uid).update({ isBlocked: false })
    await this.audit('user.unblock', actorUid, uid, {})
  }

  async renewUser(uid: string, dto: RenewUserDto, actorUid: string) {
    const snap = await this.firebase.firestore.collection(USERS).doc(uid).get()
    if (!snap.exists) throw new NotFoundException('Usuario no encontrado.')

    const data      = snap.data()!
    const base      = Math.max((data['expiresAt'] as number | null) ?? Date.now(), Date.now())
    const expiresAt = base + dto.cycleMonths * 30 * 24 * 60 * 60 * 1000

    await this.firebase.firestore.collection(USERS).doc(uid).update({
      expiresAt,
      isBlocked:      false,
      renewalHistory: FieldValue.arrayUnion({
        renewedAt:   Date.now(),
        cycleMonths: dto.cycleMonths,
        renewedBy:   actorUid,
      }),
    })

    await this.audit('user.renew', actorUid, uid, { cycleMonths: dto.cycleMonths, expiresAt })
    return { expiresAt }
  }

  async resetUserPassword(uid: string, temporaryPassword: string, actorUid: string) {
    await this.assertUserExists(uid)
    await this.firebase.auth.updateUser(uid, { password: temporaryPassword })
    await this.firebase.firestore.collection(USERS).doc(uid).update({ mustChangePassword: true })
    await this.audit('user.password_reset', actorUid, uid, {})
  }

  async deleteUser(uid: string, actorUid: string) {
    await this.assertUserExists(uid)
    await Promise.all([
      this.firebase.auth.updateUser(uid, { disabled: true }),
      this.firebase.firestore.collection(USERS).doc(uid).update({ isBlocked: true }),
    ])
    await this.audit('user.delete', actorUid, uid, {})
  }

  // ── Audit log ─────────────────────────────────────────────────────────────

  async getAuditLog(limit = 100) {
    const snap = await this.firebase.firestore
      .collection(AUDIT_LOG)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    return snap.docs.map(d => {
      const data = d.data()
      // Convert Firestore Timestamp to Unix ms so the frontend receives a plain number
      const createdAt = data['createdAt']?.toMillis?.() ?? data['createdAt'] ?? null
      return { id: d.id, ...data, createdAt }
    })
  }

  async clearAuditLog(ids?: string[]) {
    const BATCH_SIZE = 500

    if (ids && ids.length > 0) {
      // Selective deletion: only delete the specified document IDs
      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = this.firebase.firestore.batch()
        ids.slice(i, i + BATCH_SIZE).forEach(id => {
          const ref = this.firebase.firestore.collection(AUDIT_LOG).doc(id)
          batch.delete(ref)
        })
        await batch.commit()
      }
    } else {
      // Delete all logs
      const snap = await this.firebase.firestore.collection(AUDIT_LOG).get()
      const docs = snap.docs
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = this.firebase.firestore.batch()
        docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref))
        await batch.commit()
      }
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async assertUserExists(uid: string) {
    const snap = await this.firebase.firestore.collection(USERS).doc(uid).get()
    if (!snap.exists) throw new NotFoundException('Usuario no encontrado.')
  }

  private async audit(
    action: string,
    actorUid: string,
    targetUid: string,
    metadata: Record<string, unknown>,
  ) {
    await this.firebase.firestore.collection(AUDIT_LOG).add({
      actorUid,
      action,
      targetUid,
      metadata,
      createdAt: FieldValue.serverTimestamp(),
      ip:        '0.0.0.0',
    })
  }
}
