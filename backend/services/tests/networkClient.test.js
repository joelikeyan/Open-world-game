import { jest } from '@jest/globals';

class MockSocket {
  constructor() {
    this.readyState = MockSocket.CONNECTING;
    this.sent = [];
    this.listeners = {};
    MockSocket.instances.push(this);
  }

  addEventListener(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(handler);
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = MockSocket.CLOSED;
    this.emit('close');
  }

  emit(event, payload) {
    this.listeners[event]?.forEach((handler) => handler(payload));
  }

  open() {
    this.readyState = MockSocket.OPEN;
    this.emit('open');
  }

  message(data) {
    this.emit('message', { data });
  }
}

MockSocket.CONNECTING = 0;
MockSocket.OPEN = 1;
MockSocket.CLOSED = 3;
MockSocket.instances = [];

let NetworkClient;

beforeEach(async () => {
  jest.useFakeTimers();
  ({ NetworkClient } = await import('../../../client/network/networkClient.js'));
});

afterEach(() => {
  jest.useRealTimers();
  MockSocket.instances = [];
});

describe('NetworkClient', () => {
  test('queues messages until connection opens and flushes after join', () => {
    const client = new NetworkClient({
      url: 'ws://example.com',
      playerId: 'p1',
      sessionId: 's1',
      WebSocketImpl: MockSocket
    });

    client.sendPresence({ position: { x: 1, y: 2, z: 3 } });
    expect(MockSocket.instances).toHaveLength(0);

    client.connect();
    expect(MockSocket.instances).toHaveLength(1);
    const socket = MockSocket.instances[0];

    expect(client.queue).toHaveLength(1);

    socket.open();

    expect(client.queue).toHaveLength(0);
    expect(socket.sent.some((payload) => payload.includes('presence:update'))).toBe(true);
  });

  test('schedules reconnects with backoff when disconnected', () => {
    const client = new NetworkClient({
      url: 'ws://example.com',
      playerId: 'p1',
      sessionId: 's1',
      WebSocketImpl: MockSocket
    });

    client.connect();
    const socket = MockSocket.instances[0];
    socket.open();

    socket.close();

    jest.advanceTimersByTime(500);
    expect(MockSocket.instances.length).toBeGreaterThan(1);
  });

  test('interpolates remote states and resolves conflicts', () => {
    const client = new NetworkClient({
      url: 'ws://example.com',
      playerId: 'self',
      sessionId: 's1',
      WebSocketImpl: MockSocket
    });

    client.trackRemoteState({
      playerId: 'ally',
      payload: { position: { x: 0, y: 0, z: 0 }, view: 'third-person' },
      view: 'third-person'
    });

    const initial = client.remoteStates.get('ally');
    initial.updatedAt -= 100;

    client.trackRemoteState({
      playerId: 'ally',
      payload: { position: { x: 10, y: 0, z: 0 }, orientation: { yaw: 90 }, view: 'first-person' },
      view: 'first-person'
    });

    const updated = client.remoteStates.get('ally');
    const interpolated = client.getInterpolatedState('ally', updated.updatedAt + 50);
    expect(interpolated.position.x).toBeGreaterThan(0);
    expect(interpolated.orientation.yaw).toBe(90);
    expect(interpolated.view).toBe('first-person');
  });
});
