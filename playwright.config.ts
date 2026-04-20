import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  use: { headless: false },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
