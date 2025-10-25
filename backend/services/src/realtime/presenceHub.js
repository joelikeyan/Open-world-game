import { WebSocketServer } from 'ws';
import { EventLog } from './eventLog.js';

export class PresenceHub {
  constructor({ server, port }) {
    this.eventLog = new EventLog();
    this.players = new Map();
    this.server = server;
    this.port = port;
  }

  start() {
    if (this.port && !this.server) {
      this.wss = new WebSocketServer({ port: this.port });
    } else if (this.server) {
      this.wss = new WebSocketServer({ server: this.server });
    } else {
      throw new Error('PresenceHub requires a port or server instance');
    }

    this.wss.on('connection', (socket) => {
      socket.isAlive = true;
      socket.on('pong', () => {
        socket.isAlive = true;
      });

      socket.on('message', (raw) => this.handleMessage(socket, raw));
      socket.on('close', () => this.disconnect(socket));

      socket.send(JSON.stringify({ type: 'connected' }));
    });

    this.heartbeat = setInterval(() => {
      this.wss.clients.forEach((socket) => {
        if (!socket.isAlive) {
          return socket.terminate();
        }
        socket.isAlive = false;
        return socket.ping();
      });
    }, 15000);
  }

  stop() {
    clearInterval(this.heartbeat);
    this.wss?.close();
    this.players.clear();
  }

  handleMessage(socket, raw) {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch (error) {
      socket.send(JSON.stringify({ type: 'error', error: 'invalid_json' }));
      return;
    }

    switch (message.type) {
      case 'join':
        this.register(socket, message);
        break;
      case 'presence:update':
      case 'animation:update':
      case 'combat:event':
        this.broadcast(socket, message);
        break;
      case 'replay':
        this.replay(socket, message);
        break;
      default:
        socket.send(JSON.stringify({ type: 'error', error: 'unknown_type' }));
    }
  }

  register(socket, message) {
    const { playerId, sessionId, view } = message;
    if (!playerId || !sessionId) {
      socket.send(JSON.stringify({ type: 'error', error: 'missing_identifiers' }));
      return;
    }
    socket.playerId = playerId;
    socket.sessionId = sessionId;
    socket.view = view ?? 'first-person';
    this.players.set(playerId, { sessionId, view: socket.view });
    this.eventLog.push({ type: 'join', playerId, sessionId, view: socket.view });
    socket.send(JSON.stringify({ type: 'joined', playerId, sessionId, view: socket.view }));
  }

  broadcast(origin, message) {
    if (!origin.playerId) {
      origin.send(JSON.stringify({ type: 'error', error: 'join_required' }));
      return;
    }
    const enriched = {
      ...message,
      playerId: origin.playerId,
      sessionId: origin.sessionId,
      view: origin.view
    };
    this.eventLog.push(enriched);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(enriched));
      }
    });
  }

  replay(socket, message) {
    const since = message.since ?? 0;
    const events = this.eventLog.replay({ since });
    socket.send(JSON.stringify({ type: 'replay:response', events }));
  }

  disconnect(socket) {
    if (socket.playerId) {
      this.eventLog.push({ type: 'leave', playerId: socket.playerId, sessionId: socket.sessionId });
      this.players.delete(socket.playerId);
    }
  }
}
