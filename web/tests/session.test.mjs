import test from 'node:test';
import assert from 'node:assert/strict';
import { TryOnSession } from '../src/session.js';

const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
function setup(overrides = {}) {
  const log = { stops: 0, disconnects: 0, states: [], updates: [], errors: [] };
  const track = { stop: () => log.stops++, addEventListener() {} };
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const listeners = {};
  const connection = {
    disconnect: () => log.disconnects++, on: (name, handler) => { listeners[name] = handler; },
    isConnected: () => true, set: async (state) => log.updates.push(state),
  };
  const session = new TryOnSession({
    model: { fps: 25, width: 1280, height: 720 },
    createClient: () => ({ realtime: { connect: async (_stream, options) => { log.initial = options.initialState; return connection; } } }),
    getUserMedia: async (constraints) => { assert.equal(constraints.audio, false); return stream; },
    fetchToken: async () => ({ apiKey: 'ephemeral' }),
    onLocal() {}, onRemote() {}, onState: (state) => log.states.push(state), onError: (error) => log.errors.push(error.message),
    ...overrides,
  });
  return { session, stream, connection, log, listeners };
}
const shirt = new Blob(['shirt'], { type: 'image/png' });

test('initial and subsequent edits retain both image and prompt; stop releases media', async () => {
  const { session, log } = setup();
  await session.start(shirt, 'Match this shirt', true);
  try {
    assert.equal(session.state, 'live');
    assert.deepEqual(log.initial, { image: shirt, prompt: { text: 'Match this shirt', enhance: true } });
    await session.apply(shirt, 'Keep its logo', false);
    assert.deepEqual(log.updates[0], { image: shirt, prompt: 'Keep its logo', enhance: false });
  } finally { session.stop(); }
  assert.equal(log.disconnects, 1);
  assert.equal(log.stops, 1);
  assert.equal(session.state, 'idle');
});

test('stop while permission is pending never connects and stops a late camera', async () => {
  const camera = deferred();
  const { session, stream, log } = setup({ getUserMedia: () => camera.promise });
  const starting = session.start(shirt, 'shirt', true);
  session.stop();
  camera.resolve(stream);
  await starting;
  assert.equal(log.stops, 1);
  assert.equal(log.initial, undefined);
  assert.equal(session.state, 'idle');
});

test('stop during connection closes a late connection and blocks overlapping starts', async () => {
  const pending = deferred();
  const entered = deferred();
  let calls = 0;
  const { session, connection, log } = setup({ createClient: () => ({ realtime: { connect: () => { calls++; entered.resolve(); return pending.promise; } } }) });
  const starting = session.start(shirt, 'shirt', true);
  await entered.promise;
  session.stop();
  await session.start(shirt, 'shirt', true);
  assert.equal(calls, 1);
  pending.resolve(connection);
  await starting;
  assert.equal(log.disconnects, 1);
  assert.equal(log.stops, 1);
  assert.equal(session.state, 'idle');
});

test('token failures release camera and expose only safe errors', async () => {
  const { session, log } = setup({ fetchToken: async () => { throw new Error('sensitive-token'); } });
  await session.start(shirt, 'shirt', true);
  assert.equal(log.stops, 1);
  assert.equal(session.state, 'idle');
  assert.ok(!log.errors.join().includes('sensitive-token'));
});

test('terminal remote session ends camera capture', async () => {
  const { session, listeners, log } = setup();
  await session.start(shirt, 'shirt', true);
  listeners.sessionEnded();
  assert.equal(session.state, 'idle');
  assert.equal(log.stops, 1);
});
