import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The lazy 3D chunk (three.js + R3F) is large by nature; warn only above 2 MB.
  build: { chunkSizeWarningLimit: 2000 },
  test: {
    // jsdom covers React components; pure-logic tests run fine in it too.
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
