import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Data files are large; give the first load room on slow CI machines.
  timeout: 45_000,
  use: { baseURL: 'http://localhost:5173' },
  // Desktop and mobile web: one Chromium desktop, one Android phone, one iPhone (WebKit).
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
  ],
  webServer: { command: 'npx vite --port 5173 --strictPort', port: 5173, reuseExistingServer: true },
});
