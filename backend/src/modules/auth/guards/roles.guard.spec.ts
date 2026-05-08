import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'
import { ROLES_KEY } from '../decorators/roles.decorator'

// ── Helpers ────────────────────────────────────────────────────────────────
function makeContext(userRole: string | undefined, requiredRoles?: string[]): ExecutionContext {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(requiredRoles) } as any
  const guard     = new RolesGuard(reflector)

  const mockContext = {
    getHandler:  () => ({}),
    getClass:    () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: userRole ? { role: userRole } : undefined }),
    }),
  } as unknown as ExecutionContext

  return mockContext
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('RolesGuard', () => {
  let reflector: Reflector
  let guard:     RolesGuard

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any
    guard     = new RolesGuard(reflector)
  })

  it('returns true when no roles are required (public route)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    const ctx = makeContext('user', undefined)
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('returns true when required roles is an empty array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([])
    const ctx = makeContext('user', [])
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('returns true when user has exactly the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin'])
    const ctx = makeContext('admin', ['admin'])
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('returns true when user has one of multiple required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'super_admin'])
    const ctx = makeContext('super_admin', ['admin', 'super_admin'])
    expect(guard.canActivate(ctx)).toBe(true)
  })

  it('throws ForbiddenException when user role does not match', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['super_admin'])
    const ctx = makeContext('user', ['super_admin'])
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })

  it('throws ForbiddenException when user is undefined on request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin'])
    const ctx = makeContext(undefined, ['admin'])
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException)
  })

  it('uses the ROLES_KEY constant to read metadata', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user'])
    const ctx = makeContext('user', ['user'])
    guard.canActivate(ctx)
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.arrayContaining([expect.anything()])
    )
  })
})
