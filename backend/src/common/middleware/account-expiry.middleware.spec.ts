import { ForbiddenException } from '@nestjs/common'
import { AccountExpiryMiddleware } from './account-expiry.middleware'

// ── Mock factory ───────────────────────────────────────────────────────────
function makeFirebaseService(userData: Record<string, unknown> | null) {
  const updateMock = jest.fn().mockResolvedValue(undefined)

  const docMock = {
    get:    jest.fn().mockResolvedValue({
      exists: userData !== null,
      data:   () => userData,
    }),
    update: updateMock,
  }

  return {
    updateMock,
    firebase: {
      firestore: {
        collection: () => ({ doc: () => docMock }),
      },
    } as any,
  }
}

function makeReq(uid?: string) {
  return { uid } as any
}

const mockRes  = {} as any
const mockNext = jest.fn()

beforeEach(() => jest.clearAllMocks())

// ── Tests ──────────────────────────────────────────────────────────────────
describe('AccountExpiryMiddleware', () => {
  it('calls next() immediately when no uid on request (unauthenticated route)', async () => {
    const { firebase } = makeFirebaseService(null)
    const mw = new AccountExpiryMiddleware(firebase)

    await mw.use(makeReq(undefined), mockRes, mockNext)
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('calls next() for an active, non-blocked account with null expiresAt', async () => {
    const { firebase } = makeFirebaseService({ isBlocked: false, expiresAt: null })
    const mw = new AccountExpiryMiddleware(firebase)

    await mw.use(makeReq('uid-1'), mockRes, mockNext)
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('calls next() for an active account with future expiresAt', async () => {
    const { firebase } = makeFirebaseService({
      isBlocked: false,
      expiresAt: Date.now() + 9_999_999,
    })
    const mw = new AccountExpiryMiddleware(firebase)

    await mw.use(makeReq('uid-2'), mockRes, mockNext)
    expect(mockNext).toHaveBeenCalledTimes(1)
  })

  it('throws ForbiddenException when user is blocked', async () => {
    const { firebase } = makeFirebaseService({ isBlocked: true, expiresAt: null })
    const mw = new AccountExpiryMiddleware(firebase)

    await expect(mw.use(makeReq('uid-blocked'), mockRes, mockNext))
      .rejects.toBeInstanceOf(ForbiddenException)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('throws ForbiddenException when account has expired', async () => {
    const { firebase } = makeFirebaseService({
      isBlocked: false,
      expiresAt: Date.now() - 1,    // expired 1 ms ago
    })
    const mw = new AccountExpiryMiddleware(firebase)

    await expect(mw.use(makeReq('uid-expired'), mockRes, mockNext))
      .rejects.toBeInstanceOf(ForbiddenException)
  })

  it('auto-blocks the user on Firestore when their account expires', async () => {
    const { firebase, updateMock } = makeFirebaseService({
      isBlocked: false,
      expiresAt: Date.now() - 1,
    })
    const mw = new AccountExpiryMiddleware(firebase)

    await expect(mw.use(makeReq('uid-auto-block'), mockRes, mockNext))
      .rejects.toBeInstanceOf(ForbiddenException)

    expect(updateMock).toHaveBeenCalledWith({ isBlocked: true })
  })

  it('throws ForbiddenException when user document does not exist', async () => {
    const { firebase } = makeFirebaseService(null)
    const mw = new AccountExpiryMiddleware(firebase)

    await expect(mw.use(makeReq('uid-ghost'), mockRes, mockNext))
      .rejects.toBeInstanceOf(ForbiddenException)
  })
})
