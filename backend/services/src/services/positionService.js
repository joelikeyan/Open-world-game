import { query } from '../db.js';

export async function savePosition({ playerId, sessionId, position, rotation, velocity }) {
  const payload = {
    position,
    rotation,
    velocity,
    savedAt: new Date().toISOString()
  };

  const result = await query(
    `INSERT INTO player_positions (player_id, session_id, payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (player_id)
     DO UPDATE SET session_id = $2, payload = $3, updated_at = NOW()
     RETURNING *`,
    [playerId, sessionId, payload]
  );
  return result.rows[0];
}

export async function loadPosition(playerId) {
  const result = await query(
    `SELECT payload FROM player_positions WHERE player_id = $1`,
    [playerId]
  );
  return result.rows[0]?.payload ?? null;
}
