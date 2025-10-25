import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { PresenceHub } from './realtime/presenceHub.js';
import {
  createSession,
  endSession,
  getSession,
  listActiveSessions
} from './services/sessionService.js';
import { ensurePlayer, getPlayer, listPlayers } from './services/playerService.js';
import { savePosition, loadPosition } from './services/positionService.js';
import { closePool } from './db.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/players', async (req, res, next) => {
    try {
      const profile = await ensurePlayer(req.body);
      res.status(201).json(profile);
    } catch (error) {
      next(error);
    }
  });

  app.get('/players', async (_req, res, next) => {
    try {
      const players = await listPlayers();
      res.json(players);
    } catch (error) {
      next(error);
    }
  });

  app.get('/players/:playerId', async (req, res, next) => {
    try {
      const player = await getPlayer(req.params.playerId);
      if (!player) {
        res.status(404).json({ error: 'player_not_found' });
        return;
      }
      res.json(player);
    } catch (error) {
      next(error);
    }
  });

  app.post('/sessions', async (req, res, next) => {
    try {
      const session = await createSession(req.body);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  });

  app.get('/sessions/active', async (_req, res, next) => {
    try {
      const sessions = await listActiveSessions();
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  });

  app.get('/sessions/:sessionId', async (req, res, next) => {
    try {
      const session = await getSession(req.params.sessionId);
      if (!session) {
        res.status(404).json({ error: 'session_not_found' });
        return;
      }
      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  app.delete('/sessions/:sessionId', async (req, res, next) => {
    try {
      const session = await endSession(req.params.sessionId);
      if (!session) {
        res.status(404).json({ error: 'session_not_found' });
        return;
      }
      res.json(session);
    } catch (error) {
      next(error);
    }
  });

  app.post('/players/:playerId/position', async (req, res, next) => {
    try {
      const position = await savePosition({ playerId: req.params.playerId, ...req.body });
      res.status(201).json(position);
    } catch (error) {
      next(error);
    }
  });

  app.get('/players/:playerId/position', async (req, res, next) => {
    try {
      const position = await loadPosition(req.params.playerId);
      if (!position) {
        res.status(404).json({ error: 'position_not_found' });
        return;
      }
      res.json(position);
    } catch (error) {
      next(error);
    }
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  const httpServer = http.createServer(app);
  const presenceHub = new PresenceHub({ server: httpServer });
  presenceHub.start();

  const listener = httpServer.listen(config.port, () => {
    console.log(`Authoritative state service listening on port ${config.port}`);
  });

  process.on('SIGINT', async () => {
    presenceHub.stop();
    listener.close();
    await closePool();
    process.exit(0);
  });
}
