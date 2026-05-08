require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const admin = require('firebase-admin')

const EMAIL    = 'admin@nelsystems.com'
const PASSWORD = process.argv[2]
const NAME     = 'Super Admin'

if (!PASSWORD) {
  console.error('Usage: node seed-super-admin.js <password>')
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  ),
})

const auth      = admin.auth()
const firestore = admin.firestore()

async function seed() {
  // 1. Create or get the Firebase Auth user
  let uid
  try {
    const existing = await auth.getUserByEmail(EMAIL)
    uid = existing.uid
    await auth.updateUser(uid, { password: PASSWORD, displayName: NAME })
    console.log(`✓ Auth user already exists — updated (uid: ${uid})`)
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const created = await auth.createUser({ email: EMAIL, password: PASSWORD, displayName: NAME })
      uid = created.uid
      console.log(`✓ Auth user created (uid: ${uid})`)
    } else {
      throw e
    }
  }

  // 2. Set super_admin custom claim
  await auth.setCustomUserClaims(uid, { role: 'super_admin' })
  console.log('✓ Custom claim role=super_admin set')

  // 3. Create / overwrite Firestore document
  const now = Date.now()
  await firestore.collection('users').doc(uid).set({
    uid,
    email:          EMAIL,
    displayName:    NAME,
    avatarUrl:      null,
    role:           'super_admin',
    plan:           'full',
    publicKey:      '',
    createdAt:      now,
    expiresAt:      null,
    renewalHistory: [],
    isBlocked:          false,
    lastSeenAt:         now,
    mustChangePassword: false,
    status:             'offline',
  })
  console.log('✓ Firestore users document created')
  console.log(`\n  Email:    ${EMAIL}`)
  console.log(`  UID:      ${uid}`)
  console.log(`  Role:     super_admin`)
  console.log('\nListo. Podés iniciar sesión con esas credenciales.\n')
}

seed().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
