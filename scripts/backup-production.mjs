#!/usr/bin/env node
/**
 * Scheduled production backup for RenoTrack360.
 *
 * Reads the database service public URL from Railway, captures a real pg_dump inside a
 * repeatable-read snapshot through scripts/preservation.mjs (which also records per-table row
 * counts and digests), appends a line to a log, and prunes older backups beyond the retention
 * count. Never prints a credential and never writes to the database.
 *
 * Usage: node scripts/backup-production.mjs [--keep=N] [--dry-run]
 */
import {spawnSync} from 'node:child_process';
import {appendFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {capture} from './preservation.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repository = resolve(here, '..');
const backupRoot = resolve(repository, '.preservation/backups');
const logFile = resolve(backupRoot, 'backup-log.jsonl');

const cli = process.env.RAILWAY_CLI ?? 'C:/Users/rbroi/AppData/Roaming/npm/node_modules/@railway/cli/bin/railway.js';
const project = process.env.RENOTRACK_PROJECT_ID ?? '0b45fa74-d228-4db9-8d76-c929c17690f7';
const environment = process.env.RENOTRACK_ENVIRONMENT_ID ?? '6d1adb4e-01f4-4005-98b6-680588d576f9';
const databaseService = process.env.RENOTRACK_DB_SERVICE_ID ?? 'd197f06d-1c4f-4a14-923e-35893f441114';

const args = process.argv.slice(2);
const keep = Number((args.find(a => a.startsWith('--keep=')) ?? '').split('=')[1] ?? process.env.BACKUP_RETENTION ?? 14);
const dryRun = args.includes('--dry-run');

function log(entry) {
  mkdirSync(backupRoot, {recursive: true});
  appendFileSync(logFile, JSON.stringify({at: new Date().toISOString(), ...entry}) + '\n');
}

function sourceUrl() {
  const result = spawnSync(process.execPath, [cli, 'variables', '--project', project, '--environment', environment, '--service', databaseService, '--json'], {
    env: {...process.env, RAILWAY_CALLER: 'skill:use-railway@1.2.1', RAILWAY_AGENT_SESSION: 'renotrack-backup'},
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error('Could not read the database connection from Railway.');
  const url = JSON.parse(result.stdout).DATABASE_PUBLIC_URL;
  if (!url) throw new Error('No publicly reachable database URL is configured for the database service.');
  const host = new URL(url).hostname;
  if (host === '127.0.0.1' || host === 'localhost') throw new Error('Refusing to back up a loopback database.');
  return url;
}

/** Delete only directories directly inside the backup root, never a glob or an unresolved path. */
function prune(keepCount) {
  const entries = readdirSync(backupRoot, {withFileTypes: true})
    .filter(entry => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}T\d{4}$/.test(entry.name))
    .map(entry => ({name: entry.name, path: resolve(backupRoot, entry.name), at: statSync(resolve(backupRoot, entry.name)).mtimeMs}))
    .sort((a, b) => b.at - a.at);
  const removed = [];
  for (const entry of entries.slice(Math.max(1, keepCount))) {
    if (!entry.path.startsWith(backupRoot + '\\') && !entry.path.startsWith(backupRoot + '/')) continue;
    rmSync(entry.path, {recursive: true, force: true});
    removed.push(entry.name);
  }
  return removed;
}

async function main() {
  const url = sourceUrl();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', 'T');
  const directory = resolve(backupRoot, stamp);
  if (dryRun) {
    console.log(JSON.stringify({dryRun: true, directory, keep}));
    return;
  }
  if (existsSync(directory)) throw new Error('A backup for this minute already exists: ' + stamp);
  mkdirSync(backupRoot, {recursive: true});
  const captured = await capture(url, directory);
  const removed = prune(Number.isFinite(keep) ? keep : 14);
  log({ok: true, directory: stamp, tables: captured.tables, rows: captured.rows, backupSha256: captured.backupSha256, pruned: removed});
  console.log(JSON.stringify({ok: true, directory: stamp, tables: captured.tables, rows: captured.rows, pruned: removed.length}));
}

main().catch(error => {
  const message = String(error?.message ?? error).replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]').slice(0, 400);
  try { log({ok: false, error: message}); } catch {}
  console.error(JSON.stringify({ok: false, error: message}));
  process.exitCode = 1;
});
