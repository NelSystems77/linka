import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { FirebaseService } from '../../../firebase/firebase.service'

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebase: FirebaseService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest()
    const header = req.headers['authorization'] as string | undefined

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticación requerido.')
    }

    try {
      const decoded = await this.firebase.auth.verifyIdToken(header.slice(7))
      req.user      = decoded
      req.uid       = decoded.uid
      return true
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.')
    }
  }
}
