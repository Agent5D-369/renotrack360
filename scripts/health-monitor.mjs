#!/usr/bin/env node
/**
 * Polls the readiness endpoint and records the result.
 *
 * Success appends a line and clears the alert marker. Failure appends a line, writes a persistent
 * alert marker describing why, and exits nonzero so the scheduler records a failed run. It reports
 * only what the endpoint already exposes publicly: status, database reachability and timing.
 *
 *
 * On a failure episode it also emails once through Resend (the same platform transactional sender
 * the application uses), and once more when the site recovers: one message per episode, not one per
 * poll. The credential is read from the Railway service environment at send time, so no secret is
 * written to disk here, and a mail failure never hides a health failure.
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

function append(entry) {
  mkdirSync(monitorDir, {recursive: true});
  appendFileSync(logFile, JSON.stringify(entry) + '\n');
  const lines = readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
  if (lines.length > MAX_LOG_LINES) writeFileSync(logFile, lines.slice(-MAX_LOG_LINES).join('\n') + '\n');
}

const noEmail = args.includes("--no-email");

/** Read the platform mail credentials at send time; never persist them. */
function mailCredentials() {
  const cli = process.env.RAILWAY_CLI ?? "C:/Users/rbroi/AppData/Roaming/npm/node_modules/@railway/cli/bin/railway.js";
  const project = process.env.RENOTRACK_PROJECT_ID ?? "0b45fa74-d228-4db9-8d76-c929c17690f7";
  const environment = process.env.RENOTRACK_ENVIRONMENT_ID ?? "6d1adb4e-01f4-4005-98b6-680588d576f9";
  const service = process.env.RENOTRACK_APP_SERVICE_ID ?? "d50648dc-a7a2-49a1-bbdd-2e114e7bc663";
  const result = spawnSync(process.execPath, [cli, "variables", "--project", project, "--environment", environment, "--service", service, "--json"], {
    env: {...process.env, RAILWAY_CALLER: "skill:use-railway@1.2.1", RAILWAY_AGENT_SESSION: "renotrack-health-monitor"}, encoding: "utf8", timeout: 60000,
  });
  if (result.status !== 0) return null;
  const cfg = JSON.parse(result.stdout);
  const key = process.env.RESEND_API_KEY ?? cfg.RESEND_API_KEY;
  const to = process.env.RENOTRACK_ALERT_EMAIL ?? cfg.RENOTRACK_ALERT_EMAIL ?? cfg.ADMIN_EMAIL;
  if (!key || !to) return null;
  return {key, to, from: process.env.RESEND_FROM_EMAIL ?? cfg.RESEND_FROM_EMAIL ?? "noreply@renotrack360.com"};
}

async function sendAlertEmail(subject, text) {
  if (noEmail) return {sent: false, reason: "disabled by --no-email"};
  let credentials = null;
  try { credentials = mailCredentials(); } catch { credentials = null; }
  if (!credentials) return {sent: false, reason: "no mail credentials configured"};
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {Authorization: `Bearer ${credentials.key}`, "Content-Type": "application/json"},
      body: JSON.stringify({from: credentials.from, to: credentials.to, subject, text}),
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json().catch(() => null);
    return {sent: response.ok, id: body?.id ?? null, reason: response.ok ? null : `HTTP ${response.status}`};
  } catch (error) {
    return {sent: false, reason: String(error?.message ?? error).slice(0, 120)};
  }
}

function alertBody(entry, episodeStart) {
  return [
    "RenoTrack360 is not healthy.",
    "",
    `Reason: ${entry.reason}`,
    `Endpoint: ${entry.url}`,
    `HTTP status: ${entry.httpStatus}`,
    `First failure in this episode: ${episodeStart}`,
    `Latest check: ${entry.at}`,
    "",
    "The monitor polls every 15 minutes. You will not receive another alert until it recovers.",
  ].join("\n");
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
    const alreadyFailing = existsSync(alertFile);
    const since = alreadyFailing ? JSON.parse(readFileSync(alertFile, "utf8")).since ?? entry.at : entry.at;
    writeFileSync(alertFile, JSON.stringify({...entry, since}, null, 2));
    if (!alreadyFailing) {
      entry.alertEmail = await sendAlertEmail(`[RenoTrack360] Down: ${reason}`, alertBody(entry, since));
      append(entry);
    }
    console.error(JSON.stringify(entry));
    process.exitCode = 1;
    return;
  }
  if (existsSync(alertFile)) {
    const closed = JSON.parse(readFileSync(alertFile, "utf8"));
    rmSync(alertFile, {force: true});
    entry.recoveredFrom = closed.since ?? closed.at;
    entry.recoveryEmail = await sendAlertEmail("[RenoTrack360] Recovered",
      `RenoTrack360 is answering again.\n\nRecovered at: ${entry.at}\nFailing since: ${closed.since ?? closed.at}\nEndpoint: ${entry.url}\nHTTP status: ${entry.httpStatus}`);
    append(entry);
  }
  console.log(JSON.stringify(entry));
}

main().catch(error => {
  console.error(JSON.stringify({ok: false, reason: 'monitor failed: ' + String(error?.message ?? error).slice(0, 160)}));
  process.exitCode = 1;
});
