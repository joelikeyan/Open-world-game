import { query } from '../db.js';
import { ensurePlayer } from './playerService.js';

export async function createSession({ playerId, displayName, avatarUrl, metadata }) {
  const player = await ensurePlayer({ playerId, displayName, avatarUrl });
  const result = await query(
    `INSERT INTO sessions (player_id, metadata)
     VALUES ($1, $2)
     RETURNING *`,
    [player.id, metadata]
  );
  return result.rows[0];
}

export async function endSession(sessionId) {
  const result = await query(
    `UPDATE sessions
     SET status = 'ended', ended_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [sessionId]
  );
  return result.rows[0];
}

export async function getSession(sessionId) {
  const result = await query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  return result.rows[0] ?? null;
}

export async function listActiveSessions() {
  const result = await query(
    `SELECT s.*, p.display_name
     FROM sessions s
     JOIN players p ON p.id = s.player_id
     WHERE status = 'active'
     ORDER BY s.created_at DESC`
  );
  return result.rows;
}
