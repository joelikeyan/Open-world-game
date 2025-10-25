import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const worldDir = path.join(__dirname, '..', 'world');

async function copyDir(src, dest) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }));
}

async function buildManifest(target) {
  const manifest = {
    builtAt: new Date().toISOString(),
    assets: await fs.promises.readdir(target)
  };
  await fs.promises.writeFile(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function main() {
  const outputDir = path.join(config.worldOutput, 'world');
  await copyDir(worldDir, outputDir);
  await buildManifest(outputDir);
  console.log(`World assets packaged to ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
