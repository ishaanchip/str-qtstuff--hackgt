import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  envDir: false,
  build: {
    outDir: fileURLToPath(new URL('./tryon-assets', import.meta.url)),
    emptyOutDir: true,
    lib: {entry: fileURLToPath(new URL('./tryon-sdk.js', import.meta.url)), formats: ['es'], fileName: () => 'sdk.js'},
  },
});
