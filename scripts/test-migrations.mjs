import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { mkdirSync, cpSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { baselineExisting, prisma } from './baseline-existing.mjs';
import { fingerprint, postgresImage, verify } from './preservation.mjs';

const suffix = randomBytes(6).toString('hex');
const container = `flipside-migration-test-${suffix}`;
const directory = resolve(`.preservation/rehearsal-${suffix}`);
const password = randomBytes(24).toString('hex');
const bridge = '20260921000000_reconcile_existing_schema';
let started = false;
function docker(args, options = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 120000, ...options });
  if (result.status !== 0) throw new Error(`Disposable database operation failed: ${args[0]}`);
  return result.stdout.trim();
}
async function withDb(url, fn) {
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  try { return await fn(db); } finally { await db.$disconnect(); }
}

try {
  mkdirSync(`${directory}/migrations`, { recursive: true });
  cpSync('prisma/schema.prisma', `${directory}/schema.prisma`);
  for (const entry of readdirSync('prisma/migrations')) if (entry !== bridge) {
    cpSync(`prisma/migrations/${entry}`, `${directory}/migrations/${entry}`, { recursive: true });
  }
  docker(['run', '-d', '--name', container, '--label', 'flipside.disposable=migration-test',
    '-p', '127.0.0.1::5432', '--env', 'POSTGRES_PASSWORD', postgresImage], {
    env: { ...process.env, POSTGRES_PASSWORD: password },
  });
  started = true;
  for (let attempt = 0; attempt < 40; attempt++) {
    const result = spawnSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], { stdio: 'ignore' });
    if (result.status === 0) break;
    if (attempt === 39) throw new Error('Disposable database did not become ready.');
    await setTimeout(500);
  }
  const port = docker(['port', container, '5432']).split(':').pop();
  const urlFor = name => `postgresql://postgres:${password}@127.0.0.1:${port}/${name}`;
  const create = name => { docker(['exec', container, 'createdb', '-U', 'postgres', name]); return urlFor(name); };
  const fresh = create('flipside_migration_fresh');
  prisma(['migrate', 'deploy'], fresh);
  prisma(['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'], fresh);
  console.log('PASS: all migrations replay from empty PostgreSQL 18 with zero schema diff.');

  const historical = create('flipside_migration_historical');
  prisma(['migrate', 'deploy', '--schema', `${directory}/schema.prisma`], historical);
  await assert.rejects(() => baselineExisting(historical), /Prisma migrate diff failed/);
  await withDb(historical, async db => {
    await db.$executeRawUnsafe(`INSERT INTO "Organization" (id,name,"updatedAt") VALUES ('preservation-test','Preservation fixture',now())`);
    await db.$executeRawUnsafe(`INSERT INTO "InviteToken" (id,email,"organizationId",role,token,"expiresAt") VALUES ('invite-fixture','fixture@example.invalid','preservation-test','INVALID_LEGACY_ROLE','fixture-only',now())`);
  });
  const rejected = spawnSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-d', 'flipside_migration_historical'], {
    input: readFileSync(`prisma/migrations/${bridge}/migration.sql`), encoding: 'utf8',
  });
  assert.notEqual(rejected.status, 0, 'Invalid historical roles must stop the bridge.');
  const before = await withDb(historical, async db => {
    const cols = await db.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name='Activity' AND column_name='isOutOfScope'`);
    assert.equal(cols.length, 0, 'Failed bridge must roll back its preceding DDL.');
    await db.$executeRawUnsafe(`UPDATE "InviteToken" SET role='PROJECT_MANAGER' WHERE id='invite-fixture'`);
    return fingerprint(db);
  });
  prisma(['migrate', 'deploy'], historical);
  const after = await withDb(historical, db => fingerprint(db, before.columns));
  assert.deepEqual(after, before);
  console.log('PASS: historical rows/roles preserved; invalid role fails atomically without partial schema changes.');

  if (process.env.PRESERVATION_DIRECTORY) {
    const restored = create('flipside_restore_rehearsal');
    docker(['exec', '-i', container, 'pg_restore', '-U', 'postgres', '--exit-on-error', '--no-owner', '--no-acl', '-d', 'flipside_restore_rehearsal'], {
      input: readFileSync(resolve(process.env.PRESERVATION_DIRECTORY, 'database.dump')),
    });
    await verify(restored, process.env.PRESERVATION_DIRECTORY);
    await baselineExisting(restored);
    await baselineExisting(restored);
    prisma(['migrate', 'deploy'], restored);
    await verify(restored, process.env.PRESERVATION_DIRECTORY);
    for (const file of ['prisma/seed.ts', 'scripts/seed-if-fresh.ts']) {
      const denied = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', file], {
        env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: restored, FLIPSIDE_DATABASE_PURPOSE: 'disposable-demo' }, encoding: 'utf8',
      });
      assert.notEqual(denied.status, 0);
      assert.match(denied.stderr, /Demo seeding is disabled/);
    }
    await verify(restored, process.env.PRESERVATION_DIRECTORY);
    console.log('PASS: restored snapshot baselined twice safely; both production seed entry points refused writes.');
  } else {
    console.log('NOT CHECKED: restored production snapshot (set PRESERVATION_DIRECTORY).');
  }
} catch (error) {
  console.error(error.code || error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'));
  process.exitCode = 1;
} finally {
  if (started) docker(['rm', '-f', container]);
}
