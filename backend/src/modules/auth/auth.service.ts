import { Injectable, UnauthorizedException } from '@nestjs/common'
import { FirebaseService } from '../../firebase/firebase.service'

@Injectable()
export class AuthService {
  constructor(private readonly firebase: FirebaseService) {}

  async verifyToken(token: string) {
    try {
      return await this.firebase.auth.verifyIdToken(token)
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.')
    }
  }
}
