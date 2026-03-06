import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['test/setup-env.ts'],
    // E2E suites mutate process.env and hit shared Redis/DB state.
    // Keep file execution sequential to avoid cross-suite flakiness.
    fileParallelism: false,
    maxWorkers: 1,
  },
});
