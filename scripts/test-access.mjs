import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { postgresImage } from './preservation.mjs';
import { prisma } from './baseline-existing.mjs';

const name = 'flipside-access-test-' + randomBytes(6).toString('hex');
const password = randomBytes(24).toString('hex');
let started = false;
function docker(args, options = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 120000, ...options });
  if (result.status !== 0) throw new Error('Disposable access database operation failed: ' + args[0]);
  return result.stdout.trim();
}
try {
  docker(['run', '-d', '--name', name, '--label', 'flipside.disposable=access-test',
    '-p', '127.0.0.1::5432', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB', postgresImage], {
    env: { ...process.env, POSTGRES_PASSWORD: password, POSTGRES_DB: 'flipside_migration_access' },
  });
  started = true;
  for (let i = 0; i < 40; i++) {
    if (spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres'], { stdio: 'ignore' }).status === 0) break;
    if (i === 39) throw new Error('Disposable access database did not become ready.');
    await setTimeout(500);
  }
  const port = docker(['port', name, '5432']).split(':').pop();
  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/flipside_migration_access`;
  prisma(['migrate', 'deploy'], url);
  const result = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', '--test', 'scripts/access.test.ts'], {
    stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url },
  });
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.code || error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'));
  process.exitCode = 1;
} finally {
  if (started) docker(['rm', '-f', name]);
}
