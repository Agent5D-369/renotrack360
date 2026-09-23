#!/usr/bin/env node
/**
 * Polls the readiness endpoint and records the result.
 *
 * Every poll writes exactly one line to `.preservation/monitor/health-log.jsonl`. While the site is
 * failing it also keeps `.preservation/monitor/health-alert.json`, which describes the reason and when
 * the episode started, and exits nonzero so the scheduler records a failed run. A healthy poll clears
 * that marker, so its presence means "failing now" rather than "failed once".
 *
 * On a failure episode it emails once through Resend (the same platform transactional sender the
 * application uses) and once more when the site recovers: one message per episode, not one per poll.
 * Credentials are read from the environment first, then from the Railway CLI, so the same script runs
 * on a workstation and inside a container. A mail failure is recorded and never hides a health
 * failure.
 *
 * Usage: node scripts/health-monitor.mjs [--url=https://...] [--timeout=15000] [--no-email]
 */
import {appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
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
const noEmail = args.includes('--no-email');

function append(entry) {
  mkdirSync(monitorDir, {recursive: true});
  appendFileSync(logFile, JSON.stringify(entry) + '\n');
  const lines = readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
  if (lines.length > MAX_LOG_LINES) writeFileSync(logFile, lines.slice(-MAX_LOG_LINES).join('\n') + '\n');
}

function readMarker() {
  if (!existsSync(alertFile)) return null;
  try { return JSON.parse(readFileSync(alertFile, 'utf8')); } catch { return {since: null}; }
}

/** Environment first, so a container without the Railway CLI still works. */
function mailCredentials() {
  const envKey = process.env.RESEND_API_KEY;
  const envTo = process.env.RENOTRACK_ALERT_EMAIL ?? process.env.ADMIN_EMAIL;
  if (envKey && envTo) {
    return {key: envKey, to: envTo, from: process.env.RESEND_FROM_EMAIL ?? 'noreply@renotrack360.com'};
  }
  const cli = process.env.RAILWAY_CLI ?? 'C:/Users/rbroi/AppData/Roaming/npm/node_modules/@railway/cli/bin/railway.js';
  const project = process.env.RENOTRACK_PROJECT_ID ?? '0b45fa74-d228-4db9-8d76-c929c17690f7';
  const environment = process.env.RENOTRACK_ENVIRONMENT_ID ?? '6d1adb4e-01f4-4005-98b6-680588d576f9';
  const service = process.env.RENOTRACK_APP_SERVICE_ID ?? 'd50648dc-a7a2-49a1-bbdd-2e114e7bc663';
  const result = spawnSync(process.execPath, [cli, 'variables', '--project', project, '--environment', environment, '--service', service, '--json'], {
    env: {...process.env, RAILWAY_CALLER: 'skill:use-railway@1.2.1', RAILWAY_AGENT_SESSION: 'renotrack-health-monitor'},
    encoding: 'utf8', timeout: 60_000,
  });
  if (result.status !== 0) return null;
  const cfg = JSON.parse(result.stdout);
  const key = cfg.RESEND_API_KEY;
  const to = cfg.RENOTRACK_ALERT_EMAIL ?? cfg.ADMIN_EMAIL;
  if (!key || !to) return null;
  return {key, to, from: cfg.RESEND_FROM_EMAIL ?? 'noreply@renotrack360.com'};
}

async function sendAlertEmail(subject, text) {
  if (noEmail) return {sent: false, reason: 'disabled by --no-email'};
  let credentials = null;
  try { credentials = mailCredentials(); } catch { credentials = null; }
  if (!credentials) return {sent: false, reason: 'no mail credentials configured'};
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {Authorization: `Bearer ${credentials.key}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({from: credentials.from, to: credentials.to, subject, text}),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => null);
    return {sent: response.ok, id: body?.id ?? null, reason: response.ok ? null : `HTTP ${response.status}`};
  } catch (error) {
    return {sent: false, reason: String(error?.message ?? error).slice(0, 120)};
  }
}

function alertBody(entry, episodeStart) {
  return [
    'RenoTrack360 is not healthy.',
    '',
    `Reason: ${entry.reason}`,
    `Endpoint: ${entry.url}`,
    `HTTP status: ${entry.httpStatus}`,
    `First failure in this episode: ${episodeStart}`,
    `Latest check: ${entry.at}`,
    '',
    'The monitor polls every 15 minutes. You will not receive another alert until it recovers.',
  ].join('\n');
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
  const marker = readMarker();

  // Resolve the episode and send any mail before logging, so each poll produces exactly one line.
  if (reason) {
    const alreadyFailing = marker !== null;
    const since = marker?.since ?? entry.at;
    mkdirSync(monitorDir, {recursive: true});
    writeFileSync(alertFile, JSON.stringify({...entry, since}, null, 2));
    if (!alreadyFailing) entry.alertEmail = await sendAlertEmail(`[RenoTrack360] Down: ${reason}`, alertBody(entry, since));
    append(entry);
    console.error(JSON.stringify(entry));
    process.exitCode = 1;
    return;
  }

  if (marker) {
    rmSync(alertFile, {force: true});
    entry.recoveredFrom = marker.since ?? marker.at ?? null;
    entry.recoveryEmail = await sendAlertEmail(
      '[RenoTrack360] Recovered',
      `RenoTrack360 is answering again.\n\nRecovered at: ${entry.at}\nFailing since: ${entry.recoveredFrom}\nEndpoint: ${entry.url}\nHTTP status: ${entry.httpStatus}`,
    );
  }
  append(entry);
  console.log(JSON.stringify(entry));
}

main().catch(error => {
  console.error(JSON.stringify({ok: false, reason: 'monitor failed: ' + String(error?.message ?? error).slice(0, 160)}));
  process.exitCode = 1;
});
