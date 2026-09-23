#!/usr/bin/env node
/**
 * Polls the readiness endpoint and records the result.
 *
 * Success appends a line and clears the alert marker. Failure appends a line, writes a persistent
 * alert marker describing why, and exits nonzero so the scheduler records a failed run. It reports
 * only what the endpoint already exposes publicly: status, database reachability and timing.
 *
 * Usage: node scripts/health-monitor.mjs [--url=https://...] [--timeout=15000]
 */
import {appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const monitorDir = resolve(repository, '.preservation/monitor');
const logFile = resolve(monitorDir, 'health-log.jsonl');
const alertFile = resolve(monitorDir, 'health-alert.json');
const MAX_LOG_LINES = 2000;

const args = process.argv.slice(2);
const url = (args.find(a => a.startsWith('--url='))?.split('=').slice(1).join('=')) ?? process.env.RENOTRACK_HEALTH_URL ?? 'https://www.renotrack360.com/api/health';
const timeout = Number(args.find(a => a.startsWith('--timeout='))?.split('=')[1] ?? 15_000);

function append(entry) {
  mkdirSync(monitorDir, {recursive: true});
  appendFileSync(logFile, JSON.stringify(entry) + '\n');
  const lines = readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
  if (lines.length > MAX_LOG_LINES) writeFileSync(logFile, lines.slice(-MAX_LOG_LINES).join('\n') + '\n');
}

async function main() {
  const startedAt = Date.now();
  let status = 0, body = null, reason = null;
  try {
    const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(timeout)});
    status = response.status;
    body = await response.json().catch(() => null);
    if (response.status !== 200) reason = `HTTP ${response.status}`;
    else if (body?.status !== 'ok') reason = `status=${body?.status ?? 'unknown'}`;
    else if (body?.database !== 'ok') reason = `database=${body?.database ?? 'unknown'}`;
  } catch (error) {
    reason = 'unreachable: ' + String(error?.name === 'TimeoutError' ? 'timed out' : error?.message ?? 'request failed').slice(0, 120);
  }
  const entry = {at: new Date().toISOString(), url, ok: reason === null, httpStatus: status, ms: Date.now() - startedAt, ...(reason ? {reason} : {})};
  append(entry);
  if (reason) {
    mkdirSync(monitorDir, {recursive: true});
    writeFileSync(alertFile, JSON.stringify({...entry, since: existsSync(alertFile) ? JSON.parse(readFileSync(alertFile, 'utf8')).since ?? entry.at : entry.at}, null, 2));
    console.error(JSON.stringify(entry));
    process.exitCode = 1;
    return;
  }
  if (existsSync(alertFile)) rmSync(alertFile, {force: true});
  console.log(JSON.stringify(entry));
}

main().catch(error => {
  console.error(JSON.stringify({ok: false, reason: 'monitor failed: ' + String(error?.message ?? error).slice(0, 160)}));
  process.exitCode = 1;
});
