import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:http';
import express from 'express';
import { createDecartClient } from '@decartai/sdk';
import { createApi } from './api.mjs';

const root = dirname(fileURLToPath(import.meta.url));
if (existsSync(join(root, '.env.local'))) process.loadEnvFile(join(root, '.env.local'));
const port = Number(process.env.PORT || 5173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be 1024–65535.');
const apiKey = process.env.DECART_API_KEY?.trim();
const app = createApi({ apiKey, createClient: createDecartClient, port });
const server = createServer(app);
let vite;
if (process.argv.includes('--production')) {
  if (!existsSync(join(root, 'dist/index.html'))) throw new Error('Run npm run build first.');
  app.use(express.static(join(root, 'dist'), { dotfiles: 'deny' }));
} else {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({
    root,
    server: { middlewareMode: true, hmr: { server }, fs: { allow: [root] } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
server.listen(port, '127.0.0.1', () => {
  console.log(`Lucy try-on: http://localhost:${port}`);
  console.log(apiKey ? 'Decart server key configured.' : 'Add DECART_API_KEY to web/.env.local, then restart.');
});
server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Set PORT in web/.env.local.` : 'Could not start server.');
  process.exit(1);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await vite?.close();
    server.close(() => process.exit(0));
  });
}
