import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

admin.initializeApp()

const db      = admin.firestore()
const storage = admin.storage()
const BATCH_SIZE = 400

// ─── TTL: Delete expired messages ────────────────────────────────────────────

export const purgeExpiredMessages = functions.pubsub
  .schedule('every 60 minutes')
  .timeZone('America/Bogota')
  .onRun(async () => {
    const now = Date.now()
    functions.logger.info(`[TTL] purgeExpiredMessages — now=${now}`)

    const snap = await db
      .collection('messages')
      .where('expiresAt', '!=', null)
      .where('expiresAt', '<', now)
      .limit(BATCH_SIZE)
      .get()

    if (snap.empty) {
      functions.logger.info('[TTL] No expired messages.')
      return
    }

    const batch = db.batch()
    snap.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()

    functions.logger.info(`[TTL] Deleted ${snap.size} expired messages.`)
  })

// ─── TTL: Delete expired files (Firestore doc + Storage blob) ────────────────

export const purgeExpiredFiles = functions.pubsub
  .schedule('every 60 minutes')
  .timeZone('America/Bogota')
  .onRun(async () => {
    const now = Date.now()
    functions.logger.info(`[TTL] purgeExpiredFiles — now=${now}`)

    const snap = await db
      .collection('files')
      .where('expiresAt', '!=', null)
      .where('expiresAt', '<', now)
      .limit(BATCH_SIZE)
      .get()

    if (snap.empty) {
      functions.logger.info('[TTL] No expired files.')
      return
    }

    await Promise.allSettled(
      snap.docs.map(async d => {
        const data = d.data() as { storagePath: string }

        // 1. Delete encrypted blob from Firebase Storage
        try {
          await storage.bucket().file(data.storagePath).delete()
        } catch (err) {
          // File might already be gone — log but don't block Firestore deletion
          functions.logger.warn(`[TTL] Storage delete failed for ${data.storagePath}:`, err)
        }

        // 2. Delete Firestore document
        await d.ref.delete()
        functions.logger.info(`[TTL] Deleted file ${d.id}`)
      })
    )

    functions.logger.info(`[TTL] Processed ${snap.size} expired files.`)
  })

// ─── Trigger: Auto-block users whose account expired ─────────────────────────
// Runs daily at 01:00 to catch any that the middleware missed (e.g. no activity)

export const autoBlockExpiredUsers = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('America/Bogota')
  .onRun(async () => {
    const now = Date.now()

    const snap = await db
      .collection('users')
      .where('isBlocked', '==', false)
      .where('expiresAt', '<', now)
      .get()

    if (snap.empty) return

    const batch = db.batch()
    snap.docs.forEach(d => batch.update(d.ref, { isBlocked: true }))
    await batch.commit()

    functions.logger.info(`[Expiry] Auto-blocked ${snap.size} expired users.`)
  })

// ─── Trigger: Audit log on user document write ───────────────────────────────

export const onUserWrite = functions.firestore
  .document('users/{uid}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after  = change.after.data()
    const uid    = context.params['uid']

    // Only log meaningful changes
    const tracked = ['isBlocked', 'role', 'plan', 'expiresAt'] as const
    const changed = tracked.filter(k => before[k] !== after[k])
    if (changed.length === 0) return

    await db.collection('auditLog').add({
      actorUid:  'system',
      action:    'user.auto_update',
      targetUid: uid,
      metadata:  Object.fromEntries(
        changed.map(k => [k, { before: before[k], after: after[k] }])
      ),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ip:        '0.0.0.0',
    })
  })
