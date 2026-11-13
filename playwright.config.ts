import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets parallel worktrees run browser tests without sharing one dev server.
const port = Number(process.env.E2E_PORT ?? 5173);
// E2E_BASE_URL tests a deployed site instead of a local dev server (e.g. https://quranic.space).
const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  // Data files are large; give the first load room on slow CI machines.
  timeout: 45_000,
  use: { baseURL: remote ?? `http://localhost:${port}` },
  // Desktop and mobile web: one Chromium desktop, one Android phone, one iPhone (WebKit).
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
  ],
  webServer: remote
    ? undefined
    : { command: `npx vite --port ${port} --strictPort`, port, reuseExistingServer: !process.env.E2E_PORT },
});
