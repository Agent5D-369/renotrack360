# Preservation and release baseline

This runbook evolves the existing application without resetting project records.
Production startup is `npm start` only. Database changes are a separate, reviewed
release step. Never use `db push --accept-data-loss`, `migrate reset`, or demo seed
against a preserved database.

## Evidence captured September 21, 2026

- App source recovered through read-only Railway SSH: 236 files matched Git
  `b895e063ebe3c4df52763b8832c4a6df846ba9bb` after line-ending normalization.
- Production PostgreSQL 18.6 contained 91 application tables and no migration
  ledger. Its schema matched `prisma/schema.prisma` with zero diff on a restored copy.
- Consistent exported-snapshot backup restored locally with all 862 rows and all
  original column values verified. Backup SHA-256:
  `0944ab4715ce5e531f75454403639de9bbd26bdd732ed73ce0cf757810737fd7`.
- Media inventory found 23 URL references, all to Unsplash, in JobPhoto,
  FieldReport and WeeklyReport. These are external references, not proof of a
  Flipside project-photo archive. Do not represent them as historical client work.
- Source archives, database dumps, connection details and per-table fingerprints
  stay in ignored `.preservation/`, never in Git or the vault. This local recovery
  copy does not replace a separately retained production backup policy.

## Repeatable verification

Use Node 24.13.0 and npm 11.6.2 (`.nvmrc` and `packageManager`). Install with
the maintained Railway Railpack builder for releases; `engines` pins the runtime.
For local setup use
`npm ci --legacy-peer-deps`; npm's lockfile is authoritative. A broken user npm
shim can be bypassed with the npm CLI supplied beside the installed Node runtime.

```text
npm run test:production-start-safety
npm run test:migrations
npm run typecheck
npm run db:generate
npm run build
```

Migration tests require Docker and the pinned PostgreSQL 18 image. They create a
randomly named, loopback-only disposable container and remove only that container.
They prove empty replay, historical data/role preservation, and atomic refusal
of invalid legacy roles. Set `PRESERVATION_DIRECTORY` to the protected snapshot
folder to also prove restore, baseline retries and denial of both production seed
entry points. Without it, the test explicitly reports restore as NOT CHECKED.

`scripts/preservation.mjs capture` takes `PRESERVATION_SOURCE_URL` and
`PRESERVATION_DIRECTORY` through environment variables. It exports a consistent
read-only snapshot, dumps that snapshot and hashes every original row. It refuses
to overwrite evidence. Do not put URLs/passwords in a command, transcript or note.

`npm run verify:preservation` takes `PRESERVATION_TARGET_URL` and the same evidence
directory. It accepts only loopback `flipside_restore_*`/`flipside_migration_*`
databases and compares the dump checksum plus every original table/column value.
New additive columns are intentionally excluded from the historic row comparison.

## Two migration paths

**Fresh or historically migrated database:** apply the unchanged original 14
migrations followed by `20260921000000_reconcile_existing_schema`. This bridge
adds the schema elements previously created through schema push. Role conversion
uses a cast, never drop/recreate, and the whole bridge is transactional. An
unrecognized role must be reviewed and explicitly mapped; do not silently coerce it.

**Existing database already matching the complete schema:** first prove a backup
restore and zero schema diff. Record all 15 migrations as applied without replaying
them. This preserves existing rows rather than replaying historical data updates.
`scripts/baseline-existing.mjs` rehearses this on local restore targets only: it
checks the full schema first, validates any existing ledger checksums, refuses
failed/unknown entries and skips clean applied entries on retry. It cannot target
production. Never mark migrations applied merely because some tables exist.

Production baselining is a deliberate ledger-only operation after these proofs,
with fresh evidence and an identified target. Until completed, retain startup
without automatic migration. Future releases must verify ledger/checksums and
rehearse their forward migrations on a restored copy before applying changes.

## Release and rollback

1. Identify the current deployment, source and DB. Preserve environment configuration.
2. Capture fresh DB/media evidence. Review differences from the rehearsal snapshot.
3. Prove restore, migration compatibility, build and authenticated read-only workflows.
4. Use a release built from the reviewed commit. Confirm the effective Railway start
   command is `npm start` with no migration/seed override or pre-deploy hook.
5. Check login, existing quote/estimate, job/log/gallery, report and invoice flows.
   Reconcile original rows/IDs/amounts. Never charge payments or send test emails.
6. If the application fails, restore the prior compatible application artifact while
   keeping the safe `npm start` override. Do not restart an old destructive command.
   Ledger/additive schema changes remain. Do not restore an old DB over later writes.

No old migration, SaaS record, contract, media reference or business feature is
deleted by this unit. Access controls, durable private media, financial reconciliation
and the new versioned work engine remain separate implementation units.

## Apply schema changes yourself, before the release (2026-09-23)

`railway.json` keeps `startCommand: "npm start"` on purpose. An automatic
`prisma db push --accept-data-loss` was removed earlier so that a deploy can never
alter production schema by itself. Migration application is therefore a deliberate,
separate step, and a release that carries a new column will start against a database
that does not have it until someone applies it.

Learned the hard way in WU022: the settings page failed on every request in production
with "The column Organization.defaultPaymentSchedule does not exist" until the column
was added directly. The app was otherwise healthy, so the failure was narrow and silent
rather than obvious.

Required for any release containing a change under `prisma/migrations/`:

1. `node .preservation/production-migrate-deploy.mjs` - runs `prisma migrate deploy`
   against the database service public URL. Idempotent; additive migrations only.
2. `node .preservation/production-migration-status.mjs` - confirm "Database schema is
   up to date" with zero pending migrations.
3. Only then `railway up` from the exported release, and re-run the read-only live
   verification.

Do not put `prisma migrate deploy` into `startCommand`. It was tried on 2026-09-23 and
the deployment FAILED while the previous release kept serving: `prisma` is a
devDependency, so the runtime image has no CLI and `npx` tried to fetch it during
startup, past the healthcheck window. To automate this later, move `prisma` into
`dependencies` or use a pre-deploy command, and prove it with a real deploy before
trusting it.

## Scheduled production backup (2026-09-23)

`scripts/backup-production.mjs` takes a real production backup through
`scripts/preservation.mjs capture` (pg_dump inside a repeatable-read snapshot, with per-table
row counts and digests), appends a line to `.preservation/backups/backup-log.jsonl`, and prunes
older backups beyond the retention count. It never prints a credential and never writes to the
database. `--dry-run` shows the destination without capturing; `--keep=N` sets retention
(default 14).

It runs daily at 02:30 through the Windows scheduled task `RenoTrack360-Backup`. Prove it is
actually running by reading the newest entries in the log, not by trusting the task state:

```powershell
Get-ScheduledTaskInfo -TaskName RenoTrack360-Backup | Select-Object LastRunTime, LastTaskResult
Get-Content .preservation/backups/backup-log.jsonl | Select-Object -Last 3
```

A successful run logs `{"ok":true,...,"tables":110,"rows":2893,...}`. A nonzero `LastTaskResult`
or an `{"ok":false,...}` line means the backup did not happen; treat that as an incident, not a
retry.

Known limits, do not overstate them: backups live on this workstation only, so there is no
offsite copy and the schedule only fires when the machine is on; and the dump covers Postgres
only, so private media recovery is still unproven.

## Scheduled readiness monitor (2026-09-23)

`scripts/health-monitor.mjs` polls `/api/health` and records the result. Success appends a line
to `.preservation/monitor/health-log.jsonl` and clears the alert marker. Failure appends a line,
writes `.preservation/monitor/health-alert.json` describing the reason and when it started, and
exits nonzero so the scheduler records a failed run.

The Windows scheduled task `RenoTrack360-Health-Monitor` runs it every 15 minutes. Check it with:

```powershell
Get-ScheduledTaskInfo -TaskName RenoTrack360-Health-Monitor | Select-Object LastRunTime, LastTaskResult
Test-Path .preservation/monitor/health-alert.json   # present only while the site is failing
Get-Content .preservation/monitor/health-log.jsonl | Select-Object -Last 3
```

Detection was proven by pointing it at a URL that fails on purpose: it exited 1, logged
`ok:false` with the reason, and wrote the alert marker; a healthy run afterwards cleared the
marker.

Notification: the monitor emails through Resend, the same platform transactional sender the
application uses (`RESEND_API_KEY` and `RESEND_FROM_EMAIL`, already set on the service; the
recipient is `RENOTRACK_ALERT_EMAIL`, falling back to `ADMIN_EMAIL`). It sends exactly one alert
when an outage begins and exactly one note when it recovers, so a long outage does not become a
mail flood. The credential is read from the service environment at send time and is never written
to disk.

Proven on 2026-09-23 with real messages: a healthy run sent nothing, the first failure of an episode
sent one alert, a second consecutive failure sent nothing, and the recovery sent one note and cleared
the marker. `--no-email` suppresses mail when running the monitor by hand.

SMTP in Settings is a separate, per-company channel for client-facing mail; it is not required for
these operational alerts.