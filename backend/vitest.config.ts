import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    hookTimeout: 30000, // Increase from default 10s to 30s for database operations
    testTimeout: 30000,
    threads: false, // Run tests sequentially to avoid database lock contention
    isolate: false, // Don't isolate tests to reduce overhead
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/**/*.test.ts'],
    },
  },
});
