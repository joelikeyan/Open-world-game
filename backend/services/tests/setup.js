import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';
import { newDb } from 'pg-mem';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '..', 'migrations');

const mem = newDb({ autoCreateForeignKeyIndices: true });
const pgMem = mem.adapters.createPg();

mem.public.registerFunction({
  name: 'gen_random_uuid',
  returns: 'uuid',
  implementation: () => randomUUID()
});

jest.unstable_mockModule('pg', () => pgMem);

const sqlFiles = fs.readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

for (const file of sqlFiles) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  if (sql.toLowerCase().includes('create extension')) {
    continue;
  }
  mem.public.none(sql);
}

process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/mem';
