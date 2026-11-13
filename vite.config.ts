import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The lazy 3D chunk (three.js + R3F) is large by nature; warn only above 2 MB.
  build: { chunkSizeWarningLimit: 2000 },
  // The embedding worker lazy-loads transformers.js, which needs code splitting (ES workers).
  worker: { format: 'es' },
  // Pre-bundle at dev start: found later (when the worker loads), Vite would reload the page.
  optimizeDeps: { include: ['@huggingface/transformers'] },
  resolve: {
    alias: {
      // transformers.js imports the WebGPU build of the ONNX runtime, which drags in a 26 MB
      // wasm. Semantic search runs on the plain wasm backend (14 MB, 3.7 MB gzip), so use that build.
      'onnxruntime-web/webgpu': 'onnxruntime-web/wasm',
    },
  },
  test: {
    // jsdom covers React components; pure-logic tests run fine in it too.
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
