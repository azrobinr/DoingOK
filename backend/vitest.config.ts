import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    hookTimeout: 30000, // Increase from default 10s to 30s for database operations
    testTimeout: 30000,
    // All test files share one PostgreSQL database, so they must run one at a
    // time. fileParallelism:false serializes files; singleThread keeps them in
    // one worker. Without this, files race on the same seed data (P2002 on email).
    fileParallelism: false,
    isolate: false, // Don't isolate tests to reduce overhead
    poolOptions: {
      threads: { singleThread: true },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/**/*.test.ts'],
    },
  },
});
