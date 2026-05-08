// Usage:
//   Windows PowerShell:  $env:ADMIN_PASSWORD='your_password'; node scripts/seed-admin.js
//   Linux/Mac:           ADMIN_PASSWORD='your_password' node scripts/seed-admin.js
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const admin = require('firebase-admin')

// ── Config ────────────────────────────────────────────────────────────────────
const TARGET_UID    = 'qrJulCk8qUULxR1ImDgqnG3m78A2'
const EMAIL         = 'jeremy@linka.com'
const DISPLAY_NAME  = 'Jeremy'
const ROLE          = 'admin'
const PLAN          = 'full'
const CYCLE_MONTHS  = 6

// Password must come from env — never hardcoded
const PASSWORD = process.env.ADMIN_PASSWORD
if (!PASSWORD) {
  console.error('Error: ADMIN_PASSWORD environment variable is required.')
  console.error('  PowerShell:  $env:ADMIN_PASSWORD=\'<password>\'; node scripts/seed-admin.js')
  console.error('  Bash:        ADMIN_PASSWORD=\'<password>\' node scripts/seed-admin.js')
  process.exit(1)
}

// ── Init Firebase Admin ───────────────────────────────────────────────────────
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    ),
  })
}

const auth      = admin.auth()
const firestore = admin.firestore()

// ── Seed ──────────────────────────────────────────────────────────────────────
async function run() {
  const now       = Date.now()
  const cycleMs   = CYCLE_MONTHS * 30 * 24 * 60 * 60 * 1000
  const expiresAt = now + cycleMs

  // Create or update Firebase Auth user with the fixed UID
  try {
    await auth.getUser(TARGET_UID)
    await auth.updateUser(TARGET_UID, { email: EMAIL, password: PASSWORD, displayName: DISPLAY_NAME })
    console.log('[auth]      User updated.')
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      await auth.createUser({ uid: TARGET_UID, email: EMAIL, password: PASSWORD, displayName: DISPLAY_NAME })
      console.log('[auth]      User created.')
    } else {
      throw err
    }
  }

  // Set role claim so guards/middleware can read it from the token
  await auth.setCustomUserClaims(TARGET_UID, { role: ROLE })
  console.log('[auth]      Custom claims set  →  role:', ROLE)

  // Write Firestore document (matches AppUser schema in user.types.ts)
  const userData = {
    uid:                TARGET_UID,
    email:              EMAIL,
    displayName:        DISPLAY_NAME,
    avatarUrl:          null,
    role:               ROLE,
    plan:               PLAN,
    publicKey:          '',
    createdAt:          now,
    expiresAt,
    renewalHistory:     [{ renewedAt: now, cycleMonths: CYCLE_MONTHS, renewedBy: 'system' }],
    isBlocked:          false,
    lastSeenAt:         now,
    mustChangePassword: false, // seeded directly — no forced reset needed
  }

  await firestore.collection('users').doc(TARGET_UID).set(userData)
  console.log('[firestore] users/' + TARGET_UID + ' written.')

  // Audit log
  await firestore.collection('auditLog').add({
    actorUid:  'system',
    action:    'user.create',
    targetUid: TARGET_UID,
    metadata:  { role: ROLE, plan: PLAN, source: 'seed-admin-script' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ip:        '0.0.0.0',
  })
  console.log('[firestore] auditLog entry written.')

  console.log('\nAdmin seeded successfully:')
  console.log('  UID       :', TARGET_UID)
  console.log('  Email     :', EMAIL)
  console.log('  Role      :', ROLE)
  console.log('  Plan      :', PLAN)
  console.log('  ExpiresAt :', new Date(expiresAt).toISOString(), `(+${CYCLE_MONTHS} months)`)

  process.exit(0)
}

run().catch(err => {
  console.error('\nSeed failed:', err.message || err)
  process.exit(1)
})
