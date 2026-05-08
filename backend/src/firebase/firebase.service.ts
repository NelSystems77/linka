import { Injectable, OnModuleInit } from '@nestjs/common'
import * as admin from 'firebase-admin'

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app!: admin.app.App

  get auth()      { return this.app.auth() }
  get firestore() { return this.app.firestore() }
  get storage()   { return this.app.storage() }

  onModuleInit() {
    if (admin.apps.length === 0) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert(
          JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)
        ),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      })
    } else {
      this.app = admin.apps[0]!
    }
  }
}
