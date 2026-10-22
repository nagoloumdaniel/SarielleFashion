import { defineConfig, devices } from '@playwright/test';

/**
 * P3.9 — Configuration Playwright pour les tests de bout en bout du site public.
 * Trois projets : desktop, tablette, mobile.
 * Le serveur de dev Next.js est lancé automatiquement (webServer).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    {
      name: 'desktop',
      use: devices['Desktop Chrome'],
    },
    {
      name: 'tablette',
      use: devices['iPad Pro 11'],
    },
    {
      name: 'mobile',
      use: devices['Pixel 7'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
