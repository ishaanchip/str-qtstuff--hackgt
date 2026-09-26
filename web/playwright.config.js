import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser-tests',
  use: { baseURL: 'http://127.0.0.1:5174', headless: true },
  webServer: {
    command: 'node server.mjs',
    url: 'http://127.0.0.1:5174/api/config',
    env: { PORT: '5174', DECART_API_KEY: '' },
    reuseExistingServer: false,
  },
});
