import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { createApi, MODEL, SESSION_SECONDS } from '../api.mjs';

async function withServer(options, run) {
  const app = createApi({ createClient: () => { throw new Error('unexpected upstream call'); }, ...options });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const request = (path, init = {}) => new Promise((resolve, reject) => {
    const req = httpRequest(url + path, {
      ...init, headers: { Host: 'localhost:5173', Origin: 'http://localhost:5173', ...init.headers },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: res.headers })));
    });
    req.on('error', reject);
    req.end();
  });
  try { await run(request); } finally { await new Promise((resolve) => server.close(resolve)); }
}

test('missing key has actionable error and config never includes credentials', async () => {
  await withServer({}, async (request) => {
    assert.equal((await (await request('/api/config')).json()).configured, false);
    const response = await request('/api/realtime-token', { method: 'POST' });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /DECART_API_KEY/);
  });
});

test('tokens are scoped, ephemeral, uncached, and rate-limited', async () => {
  let calls = 0;
  await withServer({ apiKey: 'server-secret', createClient: (config) => {
    assert.equal(config.apiKey, 'server-secret');
    return { tokens: { create: async (options) => {
      calls++;
      assert.deepEqual(options, { expiresIn: 60, allowedModels: [MODEL], allowedOrigins: ['http://localhost:5173'], constraints: { realtime: { maxSessionDuration: SESSION_SECONDS } } });
      return { apiKey: 'ephemeral', expiresAt: 'later', metadata: 'omit this' };
    } } };
  } }, async (request) => {
    const config = await (await request('/api/config')).text();
    assert.ok(!config.includes('server-secret'));
    const response = await request('/api/realtime-token', { method: 'POST' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { apiKey: 'ephemeral', expiresAt: 'later' });
    assert.equal((await request('/api/realtime-token', { method: 'POST' })).status, 429);
    assert.equal(calls, 1);
  });
});

test('rejects cross-origin and DNS-rebinding requests before minting', async () => {
  await withServer({ apiKey: 'server-secret' }, async (request) => {
    assert.equal((await request('/api/realtime-token', { method: 'POST', headers: { Origin: 'https://other.example' } })).status, 403);
    assert.equal((await request('/api/config', { headers: { Host: 'other.example' } })).status, 403);
    assert.equal((await request('/api/realtime-token', { method: 'POST', headers: { Origin: '' } })).status, 403);
  });
});

test('upstream failures do not leak the permanent key or raw errors', async () => {
  await withServer({ apiKey: 'server-secret', createClient: () => ({ tokens: { create: async () => { throw new Error('server-secret'); } } }) }, async (request) => {
    const response = await request('/api/realtime-token', { method: 'POST' });
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('server-secret'));
  });
});
