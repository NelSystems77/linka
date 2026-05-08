import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { FirebaseService } from '../../firebase/firebase.service'

@Injectable()
export class AccountExpiryMiddleware implements NestMiddleware {
  constructor(private readonly firebase: FirebaseService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const uid = (req as Request & { uid?: string }).uid
    if (!uid) { next(); return }

    const userDoc = await this.firebase.firestore
      .collection('users')
      .doc(uid)
      .get()

    if (!userDoc.exists) throw new ForbiddenException('Usuario no encontrado.')

    const data = userDoc.data()!

    if (data['isBlocked']) {
      throw new ForbiddenException('Cuenta bloqueada.')
    }

    if (data['expiresAt'] !== null && Date.now() > data['expiresAt']) {
      // Auto-block the account for subsequent checks
      await this.firebase.firestore
        .collection('users')
        .doc(uid)
        .update({ isBlocked: true })
      throw new ForbiddenException('Cuenta expirada. Contacta al administrador para renovar.')
    }

    next()
  }
}
