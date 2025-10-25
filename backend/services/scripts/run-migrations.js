import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getClient } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '..', 'migrations');

async function ensureVersionTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migration_version (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

async function main() {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await ensureVersionTable(client);

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const exists = await client.query(
        'SELECT 1 FROM migration_version WHERE filename = $1',
        [file]
      );
      if (exists.rowCount > 0) {
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query(sql);
      await client.query(
        'INSERT INTO migration_version (filename) VALUES ($1)',
        [file]
      );
      console.log(`Applied migration ${file}`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed', error);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main();
