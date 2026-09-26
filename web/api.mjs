import express from 'express';

export const MODEL = 'lucy-2.5';
export const SESSION_SECONDS = 300;

// This server is intentionally local-only. Add authenticated users and a shared
// rate limiter before exposing token issuance as a hosted application.
export function createApi({ apiKey, createClient, port = 5173, now = Date.now }) {
  const app = express();
  app.disable('x-powered-by');
  const origins = new Set([`http://localhost:${port}`, `http://127.0.0.1:${port}`]);
  const hosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
  let lastMint = -Infinity;
  let minting = false;
  app.use((req, res, next) => {
    if (!hosts.has(req.headers.host)) return res.status(403).json({ error: 'Local access only.' });
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Permissions-Policy', 'camera=(self), microphone=()');
    next();
  });
  app.get('/api/config', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ configured: Boolean(apiKey), model: MODEL, sessionSeconds: SESSION_SECONDS });
  });
  app.post('/api/realtime-token', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.headers.origin;
    if (!origins.has(origin)) return res.status(403).json({ error: 'Open the app on localhost to start a session.' });
    if (!apiKey) return res.status(503).json({ error: 'Set DECART_API_KEY in web/.env.local and restart the server.' });
    if (minting || now() - lastMint < 5000) {
      res.set('Retry-After', '5');
      return res.status(429).json({ error: 'Please wait five seconds before starting another session.' });
    }
    minting = true;
    lastMint = now();
    try {
      const client = createClient({ apiKey, telemetry: false });
      const token = await client.tokens.create({
        expiresIn: 60,
        allowedModels: [MODEL],
        allowedOrigins: [origin],
        constraints: { realtime: { maxSessionDuration: SESSION_SECONDS } },
      });
      // Only the ephemeral credential is returned, never the permanent key or
      // upstream error text (which can include request/authentication details).
      if (!token.apiKey || token.apiKey === apiKey) throw new Error('Invalid token response');
      res.json({ apiKey: token.apiKey, expiresAt: token.expiresAt });
    } catch {
      res.status(502).json({ error: 'Decart could not create a session token. Check your server API key, account access, and connection.' });
    } finally {
      minting = false;
    }
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API endpoint.' }));
  return app;
}
