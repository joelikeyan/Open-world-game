import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { config } from '../src/config.js';

async function ensureDir(directory) {
  await fs.promises.mkdir(directory, { recursive: true });
}

async function runBackup() {
  await ensureDir(config.backupDirectory);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(config.backupDirectory, `backup-${timestamp}.sql`);

  await new Promise((resolve, reject) => {
    const dump = spawn('pg_dump', ['-f', filePath, config.database.connectionString], {
      stdio: 'inherit'
    });
    dump.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_dump exited with code ${code}`));
      }
    });
  });

  console.log(`Backup written to ${filePath}`);
}

runBackup().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
