import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({
  path: process.env.DOTENV_PATH
    || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env')
});

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  wsPort: parseInt(process.env.WS_PORT ?? '4001', 10),
  database: {
    connectionString: process.env.DATABASE_URL
      || 'postgres://postgres:postgres@postgres:5432/open_world_game'
  },
  backupDirectory: process.env.BACKUP_DIRECTORY || path.resolve('backups'),
  worldOutput: process.env.WORLD_OUTPUT || path.resolve('dist')
};
