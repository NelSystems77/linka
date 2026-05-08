import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/domains/**/*.{ts,tsx}'],
      exclude: ['**/*.test.*', '**/*.spec.*', '**/types/**', '**/*.d.ts'],
      thresholds: { lines: 70, functions: 70, branches: 65 },
    },
    // Separate environments per file via @vitest-environment docblock
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
