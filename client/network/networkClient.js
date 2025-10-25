const DEFAULT_BACKOFF = {
  initial: 500,
  max: 8000
};

function createEmitter() {
  const listeners = new Map();
  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event).delete(handler);
    },
    emit(event, payload) {
      const handlers = listeners.get(event);
      if (!handlers) return;
      handlers.forEach((handler) => handler(payload));
    }
  };
}

export class NetworkClient {
  constructor({ url, playerId, sessionId, view = 'first-person', WebSocketImpl }) {
    this.url = url;
    this.playerId = playerId;
    this.sessionId = sessionId;
    this.view = view;
    this.WebSocketImpl = WebSocketImpl || (typeof WebSocket !== 'undefined' ? WebSocket : null);
    if (!this.WebSocketImpl) {
      throw new Error('WebSocket implementation required');
    }
    this.emitter = createEmitter();
    this.backoff = { ...DEFAULT_BACKOFF };
    this.remoteStates = new Map();
    this.reconnectAttempts = 0;
    this.connected = false;
    this.queue = [];
  }

  on(event, handler) {
    return this.emitter.on(event, handler);
  }

  connect() {
    if (this.socket && (this.socket.readyState === 0 || this.socket.readyState === 1)) {
      return;
    }
    this.socket = new this.WebSocketImpl(this.url);
    this.socket.addEventListener('open', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.socket.send(JSON.stringify({
        type: 'join',
        playerId: this.playerId,
        sessionId: this.sessionId,
        view: this.view
      }));
      this.flushQueue();
      this.emitter.emit('connected');
    });
    this.socket.addEventListener('message', (event) => this.handleMessage(event));
    this.socket.addEventListener('close', () => this.handleClose());
    this.socket.addEventListener('error', (error) => this.emitter.emit('error', error));
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.connected = false;
  }

  handleClose() {
    this.connected = false;
    this.emitter.emit('disconnected');
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    const delay = Math.min(
      this.backoff.initial * 2 ** this.reconnectAttempts,
      this.backoff.max
    );
    this.reconnectAttempts += 1;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  flushQueue() {
    while (this.queue.length > 0 && this.connected) {
      const payload = this.queue.shift();
      this.socket.send(JSON.stringify(payload));
    }
  }

  send(type, payload) {
    const message = { type, ...payload };
    if (!this.connected) {
      this.queue.push(message);
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  sendPresence(presence) {
    this.send('presence:update', { payload: presence });
  }

  sendAnimation(animation) {
    this.send('animation:update', { payload: animation });
  }

  sendCombat(event) {
    this.send('combat:event', { payload: event });
  }

  handleMessage(event) {
    const data = typeof event.data === 'string' ? event.data : event.data.toString();
    const message = JSON.parse(data);
    switch (message.type) {
      case 'presence:update':
        this.trackRemoteState(message);
        this.emitter.emit('presence', message);
        break;
      case 'animation:update':
        this.emitter.emit('animation', message);
        break;
      case 'combat:event':
        this.emitter.emit('combat', message);
        break;
      case 'joined':
        this.emitter.emit('joined', message);
        break;
      case 'replay:response':
        message.events.forEach((evt) => {
          if (evt.type === 'presence:update') {
            this.trackRemoteState(evt);
          }
        });
        this.emitter.emit('replay', message);
        break;
      case 'error':
        this.emitter.emit('error', message);
        break;
      default:
        this.emitter.emit('message', message);
    }
  }

  trackRemoteState(message) {
    const { playerId, payload, view } = message;
    if (playerId === this.playerId) {
      return;
    }
    const existingEntry = this.remoteStates.get(playerId);
    const currentState = existingEntry?.target;
    const resolved = this.resolveConflict(currentState, { ...payload, view });
    const baseline = currentState ?? { ...payload, view };
    this.remoteStates.set(playerId, {
      last: baseline,
      target: resolved,
      updatedAt: performance.now ? performance.now() : Date.now()
    });
  }

  resolveConflict(existing, incoming) {
    if (!existing) return incoming;
    if (existing.view === incoming.view) {
      return incoming;
    }
    if (incoming.view === 'first-person') {
      return { ...existing, ...incoming, orientation: incoming.orientation ?? existing.orientation };
    }
    return { ...existing, position: incoming.position ?? existing.position, view: incoming.view };
  }

  getInterpolatedState(playerId, now = performance.now ? performance.now() : Date.now()) {
    const entry = this.remoteStates.get(playerId);
    if (!entry) return null;
    const elapsed = Math.min((now - entry.updatedAt) / 100, 1);
    const interpolate = (a, b) => a + (b - a) * elapsed;
    const last = entry.last.position ?? entry.last;
    const target = entry.target.position ?? entry.target;
    if (!last || !target) {
      return entry.target;
    }
    return {
      ...entry.target,
      position: {
        x: interpolate(last.x ?? 0, target.x ?? 0),
        y: interpolate(last.y ?? 0, target.y ?? 0),
        z: interpolate(last.z ?? 0, target.z ?? 0)
      }
    };
  }
}
