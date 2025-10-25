import http from 'http';
import WebSocket from 'ws';
import request from 'supertest';

let createApp;
let PresenceHub;
let closePool;

beforeAll(async () => {
  ({ createApp } = await import('../src/index.js'));
  ({ PresenceHub } = await import('../src/realtime/presenceHub.js'));
  ({ closePool } = await import('../src/db.js'));
});

afterAll(async () => {
  await closePool();
});

describe('PresenceHub WebSocket integration', () => {
  test('broadcasts updates and supports replay', async () => {
    const app = createApp();
    const server = http.createServer(app);
    const presenceHub = new PresenceHub({ server });
    presenceHub.start();

    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
    const wsUrl = `ws://127.0.0.1:${address.port}`;

    const profile = {
      playerId: '33333333-3333-3333-3333-333333333333',
      displayName: 'Ranger',
      avatarUrl: null
    };

    await request(app).post('/players').send(profile);
    const sessionResponse = await request(app)
      .post('/sessions')
      .send({ ...profile })
      .expect(201);
    const sessionId = sessionResponse.body.id;

    const clientA = new WebSocket(wsUrl);
    const clientB = new WebSocket(wsUrl);

    const messagesA = [];
    const messagesB = [];

    clientA.on('message', (data) => messagesA.push(JSON.parse(data.toString())));
    clientB.on('message', (data) => messagesB.push(JSON.parse(data.toString())));

    await waitForOpen(clientA);
    await waitForOpen(clientB);

    clientA.send(JSON.stringify({ type: 'join', playerId: profile.playerId, sessionId, view: 'first-person' }));
    clientB.send(JSON.stringify({ type: 'join', playerId: '44444444-4444-4444-4444-444444444444', sessionId, view: 'third-person' }));

    await delay(50);

    clientA.send(JSON.stringify({
      type: 'presence:update',
      payload: { position: { x: 10, y: 5, z: -2 } }
    }));

    await waitFor(() => messagesB.some((msg) => msg.type === 'presence:update'));

    const replayPromise = waitForMessage(clientB, 'replay:response');
    clientB.send(JSON.stringify({ type: 'replay' }));
    const replayMessage = await replayPromise;

    expect(replayMessage.events.some((event) => event.type === 'presence:update')).toBe(true);

    clientA.terminate();
    clientB.terminate();

    presenceHub.stop();
    server.close();
  }, 10000);
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFor(condition, timeout = 1000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      if (condition()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error('waitFor timeout'));
        return;
      }
      setTimeout(check, 20);
    }
    check();
  });
}

function waitForOpen(ws) {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    ws.on('open', resolve);
  });
}

function waitForMessage(ws, type) {
  return new Promise((resolve) => {
    const handler = (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === type) {
        ws.off('message', handler);
        resolve(message);
      }
    };
    ws.on('message', handler);
  });
}
