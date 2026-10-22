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
    launchOptions: recording ? { slowMo: Number(process.env.SLOWMO ?? 150) } : {},
  },
  projects: [
    { name: 'phone-portrait', use: { ...phone, viewport: { width: 390, height: 844 } } },
    { name: 'phone-landscape', use: { ...phone, viewport: { width: 844, height: 390 } } },
    { name: 'small-phone-landscape', testMatch: /(attack|match|coach|lab|tournament)\.spec/, use: { ...phone, viewport: { width: 568, height: 320 } } },
    { name: 'small-phone-portrait', testMatch: /(attack|match|coach|lab|tournament)\.spec/, use: { ...phone, viewport: { width: 320, height: 568 } } },
    {
      name: 'desktop',
      testMatch: /(attack|match|coach|lab|tournament)\.spec/,
      // A 1280x720 software-rendered WebGL canvas saturates a CI core; two at once starve each other's frame loop.
      workers: 1,
      use: { browserName: 'chromium', viewport: { width: 1280, height: 720 }, hasTouch: false, isMobile: false },
    },
    // Opt-in (WEBKIT=1): Playwright's WebKit build with touch on Linux. Not iOS Safari: no real Safari chrome, safe areas or iOS gesture system.
    ...(process.env.WEBKIT
      ? [{ name: 'webkit-phone-landscape', testMatch: /(match|lab)\.spec/, use: { browserName: 'webkit' as const, isMobile: true, hasTouch: true, deviceScaleFactor: 3, viewport: { width: 844, height: 390 } } }]
      : []),
  ],
  webServer: {
    command: `SMR_LAB=1 npm run build && npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
