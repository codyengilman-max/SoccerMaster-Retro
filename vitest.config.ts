import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Seeded whole-match/session simulations take several seconds each; on 2-core CI runners files run
    // side by side, so the 5 s default is a CPU-contention limit, not a correctness check.
    testTimeout: 30_000,
  },
});
