import '@testing-library/jest-dom'

// ── Firebase mocks (global — every test file gets these) ─────────────────────
vi.mock('@/core/config/firebase.config', () => ({
  auth:      {},
  firestore: {},
  storage:   {},
}))

// ── idb (IndexedDB) mock ──────────────────────────────────────────────────────
// keyManager.service.ts uses idb; tests that need IndexedDB mock it per-file.
vi.mock('idb', () => ({
  openDB: vi.fn(),
}))
