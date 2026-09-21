import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertRestoreTarget } from './preservation.mjs';

export function prisma(args, url) {
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
    env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', timeout: 120000,
  });
  if (result.status !== 0) throw new Error(`Prisma ${args.slice(0, 2).join(' ')} failed (exit ${result.status}); target was not changed by this wrapper beyond that command.`);
  return result.stdout;
}

/** Local rehearsal only. Never infer an applied migration from table presence. */
export async function baselineExisting(url) {
  assertRestoreTarget(url);
  // The complete schema must already match before any ledger writes.
  prisma(['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma',
    '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'], url);
  const names = readdirSync('prisma/migrations', { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  const checksums = Object.fromEntries(names.map(name => {
    const content = readFileSync(`prisma/migrations/${name}/migration.sql`, 'utf8');
    const lf = content.replaceAll('\r\n', '\n');
    return [name, new Set([content, lf, lf.replaceAll('\n', '\r\n')].map(value => createHash('sha256').update(value).digest('hex')))];
  }));
  const db = new PrismaClient({ datasources: { db: { url } }, log: [] });
  try {
    const [table] = await db.$queryRawUnsafe(`SELECT to_regclass('public._prisma_migrations')::text AS name`);
    const rows = table.name ? await db.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"') : [];
    for (const row of rows) {
      if (!checksums[row.migration_name]?.has(row.checksum) || !row.finished_at || row.rolled_back_at) {
        throw new Error('Existing migration ledger is not a clean subset of this exact history. Review required.');
      }
    }
    for (const name of names) if (!rows.some(row => row.migration_name === name)) {
      prisma(['migrate', 'resolve', '--applied', name], url);
    }
    prisma(['migrate', 'status'], url);
    console.log(`PASS: schema-verified baseline contains ${names.length} migrations; existing records were not replayed.`);
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve('scripts/baseline-existing.mjs')) {
  baselineExisting(process.env.PRESERVATION_TARGET_URL).catch(error => {
    console.error(error.code || error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'));
    process.exitCode = 1;
  });
}
