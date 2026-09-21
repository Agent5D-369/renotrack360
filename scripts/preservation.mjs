import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const postgresImage = 'postgres:18@sha256:86c951e05bf56c93d95d397747fb8820ac76cc3bedb78f43abd83eedbe3666ae';
const quote = name => '"' + name.replaceAll('"', '""') + '"';

export function assertRestoreTarget(value) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || !/^\/flipside_(restore|migration)_[a-z0-9_]+$/.test(url.pathname)
    || url.searchParams.has('host') || url.searchParams.has('hostaddr')) {
    throw new Error('Verification target must be a loopback flipside_restore_* or flipside_migration_* database.');
  }
  return url;
}

export async function fingerprint(tx, expected) {
  const columns = expected ?? await tx.$queryRawUnsafe(`SELECT table_name, column_name
    FROM information_schema.columns WHERE table_schema='public' AND table_name <> '_prisma_migrations'
    ORDER BY table_name, ordinal_position`);
  const tables = {};
  for (const { table_name, column_name } of columns) (tables[table_name] ??= []).push(column_name);
  const result = {};
  for (const [table, names] of Object.entries(tables)) {
    const rows = await tx.$queryRawUnsafe(`SELECT count(*)::text AS count,
      md5(coalesce(string_agg(row_hash, '' ORDER BY row_hash), '')) AS digest
      FROM (SELECT md5(to_jsonb(r)::text) AS row_hash
        FROM (SELECT ${names.map(quote).join(',')} FROM public.${quote(table)}) r) h`);
    result[table] = rows[0];
  }
  return { columns, tables: result };
}

export async function capture(sourceUrl, directory) {
  const destination = resolve(directory);
  if (existsSync(resolve(destination, 'database.dump')) || existsSync(resolve(destination, 'manifest.json'))) {
    throw new Error('Preservation destination already contains evidence; choose a new directory.');
  }
  mkdirSync(destination, { recursive: true });
  const source = new URL(sourceUrl);
  const db = new PrismaClient({ datasources: { db: { url: sourceUrl } }, log: [] });
  try {
    const manifest = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const [{ snapshot }] = await tx.$queryRawUnsafe('SELECT pg_export_snapshot() AS snapshot');
      const result = spawnSync('docker', ['run', '--rm', '--mount', `type=bind,source=${destination},target=/backup`,
        ...['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE'].flatMap(k => ['--env', k]),
        postgresImage, 'pg_dump', '--format=custom', '--no-owner', '--no-acl',
        `--snapshot=${snapshot}`, '--file=/backup/database.dump'], {
        env: { ...process.env, PGHOST: source.hostname, PGPORT: source.port || '5432',
          PGUSER: decodeURIComponent(source.username), PGPASSWORD: decodeURIComponent(source.password),
          PGDATABASE: decodeURIComponent(source.pathname.slice(1)), PGSSLMODE: source.searchParams.get('sslmode') || 'prefer' },
        encoding: 'utf8', timeout: 180000,
      });
      if (result.status !== 0) throw new Error('Database backup failed; no credentials or database contents logged.');
      return { capturedAt: new Date().toISOString(), ...await fingerprint(tx) };
    }, { isolationLevel: 'RepeatableRead', timeout: 240000 });
    manifest.backupSha256 = createHash('sha256').update(readFileSync(resolve(destination, 'database.dump'))).digest('hex');
    writeFileSync(resolve(destination, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return { tables: Object.keys(manifest.tables).length, rows: Object.values(manifest.tables).reduce((n, t) => n + Number(t.count), 0), backupSha256: manifest.backupSha256 };
  } finally { await db.$disconnect(); }
}

export async function verify(targetUrl, directory) {
  assertRestoreTarget(targetUrl);
  const expected = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8'));
  const actualHash = createHash('sha256').update(readFileSync(resolve(directory, 'database.dump'))).digest('hex');
  if (actualHash !== expected.backupSha256) throw new Error('Backup checksum mismatch.');
  const db = new PrismaClient({ datasources: { db: { url: targetUrl } }, log: [] });
  try {
    const actual = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      return fingerprint(tx, expected.columns);
    }, { isolationLevel: 'RepeatableRead', timeout: 120000 });
    for (const [table, data] of Object.entries(expected.tables)) {
      if (JSON.stringify(data) !== JSON.stringify(actual.tables[table])) throw new Error(`Preservation mismatch in ${table}.`);
    }
    console.log(`PASS: ${Object.keys(expected.tables).length} tables retain every original row/column value; backup checksum verified.`);
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve('scripts/preservation.mjs')) {
  const mode = process.argv[2];
  const directory = process.env.PRESERVATION_DIRECTORY || '.preservation/production-20260921';
  const operation = mode === 'capture'
    ? capture(process.env.PRESERVATION_SOURCE_URL, directory).then(summary => console.log(JSON.stringify(summary)))
    : verify(process.env.PRESERVATION_TARGET_URL, directory);
  operation.catch(error => { console.error(error.code || error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]')); process.exitCode = 1; });
}
