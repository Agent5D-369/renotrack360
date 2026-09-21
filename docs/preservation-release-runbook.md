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
