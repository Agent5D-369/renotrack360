# Authorized cost and scope catalog

The staff catalog at `/cost-intelligence/catalog` retains authorized Homewyse source pages as immutable versions. The initial September 21, 2026 capture covers four published indexes: installation, maintenance, materials and projects. Raw pages and the normalized import package are retained in the operator's ignored preservation storage; credentials are never included.

## Refresh

Download the four official index pages into a cache as `services-index.html`, `maintenance-index.html`, `materials-index.html` and `projects-index.html`. Record the published factor endpoint response for Austin ZIP 78704 as `austin-78704-factor.txt`.

1. `python scripts/homewyse-source-parser.py index CACHE`
2. `./scripts/download-homewyse.ps1 -CacheRoot CACHE` (resumes already captured pages).
3. `python scripts/homewyse-source-parser.py normalize CACHE --output IMPORT.json`
4. Set `DATABASE_URL` and the existing active owner's `HOMEWYSE_IMPORT_ACTOR_ID` securely. Run `node node_modules/tsx/dist/cli.mjs scripts/import-homewyse.ts IMPORT.json`. A remote database also requires `--authorized-production-import`.

Imports use bounded atomic batches with audit records. Identical data is retained on retry, even with a new retrieval timestamp. Changed source content creates a new version. Saved prices retain their source version and quantity. Imports never reprice existing estimates, contracts or saved scenarios.

## Calculation boundary

The supported UC1/v97 model retains published component quantities, labor productivity, fixed quantities, rounding offset, selected defaults and minimum labor hours. The dated ZIP factor applies to labor; nonlabor uses the source formula `1 + 0.15 * (factor - 1)`. Austin 78704 is an explicit illustration, not a universal regional adjustment.

Published static HTML dollar columns can repeat placeholders. They are never treated as calculated prices. Other calculator variants retain descriptions, options and source formula text as references; source text is never executed. Inverted component ranges are retained unchanged as references with an explanatory note.

The Flipside draft uses calculated labor hours at $55 loaded replacement cost and midpoint nonlabor allowances. The user reviews quantities, trade-specific rates, PM at the recommended $95/hour, supplier quotes, permits and risk. The source market labor price is not passed off as direct labor cost. Saving a scenario does not approve a client price.

## Verification

`node scripts/test-access.mjs homewyse` checks published shower arithmetic, minimum labor, geography, immutable/idempotent import, owner access, rollback and source-linked pricing. The access suite checks every staff entrypoint. Migration rehearsal restores a fresh production backup and compares original records before and after migration.
