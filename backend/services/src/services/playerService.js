import { query } from '../db.js';

export async function ensurePlayer(profile) {
  const { playerId, displayName, avatarUrl } = profile;
  const existing = await query('SELECT id FROM players WHERE id = $1', [playerId]);
  if (existing.rowCount === 0) {
    await query(
      `INSERT INTO players (id, display_name, avatar_url)
       VALUES ($1, $2, $3)`,
      [playerId, displayName, avatarUrl]
    );
  } else {
    await query(
      `UPDATE players SET display_name = $2, avatar_url = $3, updated_at = NOW()
       WHERE id = $1`,
      [playerId, displayName, avatarUrl]
    );
  }
  return getPlayer(playerId);
}

export async function getPlayer(playerId) {
  const result = await query('SELECT * FROM players WHERE id = $1', [playerId]);
  return result.rows[0] ?? null;
}

export async function listPlayers() {
  const result = await query('SELECT * FROM players ORDER BY created_at DESC');
  return result.rows;
}
