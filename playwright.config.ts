import { defineConfig } from '@playwright/test';

const recording = Boolean(process.env.RECORD_VIDEO);
const port = 4173;

const phone = {
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  browserName: 'chromium' as const,
};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    video: recording ? 'on' : 'off',
    launchOptions: recording ? { slowMo: 150 } : {},
  },
  projects: [
    { name: 'phone-portrait', use: { ...phone, viewport: { width: 390, height: 844 } } },
    { name: 'phone-landscape', use: { ...phone, viewport: { width: 844, height: 390 } } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
