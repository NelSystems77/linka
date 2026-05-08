import { Injectable, NotFoundException } from '@nestjs/common'
import { FirebaseService } from '../../firebase/firebase.service'

@Injectable()
export class UsersService {
  constructor(private readonly firebase: FirebaseService) {}

  async findAll() {
    const snap = await this.firebase.firestore.collection('users').get()
    return snap.docs.map(d => d.data())
  }

  async findOne(uid: string) {
    const snap = await this.firebase.firestore.collection('users').doc(uid).get()
    if (!snap.exists) throw new NotFoundException('Usuario no encontrado.')
    return snap.data()
  }

  async updatePublicKey(uid: string, publicKey: string) {
    await this.firebase.firestore.collection('users').doc(uid).update({ publicKey })
  }
}
