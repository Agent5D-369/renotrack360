# Retained proposal acceptance

From an estimate, open **Review and issue proposal**. Review a saved gross-margin price matching the draft total, upload the complete client proposal PDF, and enter the actual scope, exclusions, allowances, schedule assumptions, payment/change procedure, warranty reference and required deposit. Only the current owner can issue the 14-day link. Issuance sends no message and never reprices historical records.

The link displays only retained client content and the exact private PDF. The response requires the displayed digest, signer name and explicit acknowledgment. Changed pending source records, replaced or expired links, revoked issuers and altered documents cannot authorize acceptance. The selected source, price, content and client acceptance are immutable. Declining creates no job or receipt.

After acceptance, the owner creates one job at the accepted price. Repeated submissions return the existing result. Financial review remains required; the contract/deposit must match the accepted version, and subsequent changes use the reviewed change workflow. The old quote conversion action now routes through this acceptance boundary. Existing jobs remain available.

This workflow records owner review and a named response through a capability link. It does not independently verify signer identity, supply legal terms, collect money, promise dates, send email, or certify construction readiness. Retain the actual approved document and share the link through the intended client channel. Scope packages still require documented job financial review and accountable human evidence review.

Verification: `node scripts/test-access.mjs estimate-acceptance` (three focused transactional tests), `financial-review` (eight regressions), `access` (nine checks), production build, 25-migration replay/restore and `scripts/estimate-acceptance-http-smoke.ts` (native upload, issuance, public document, acceptance/retry, owner conversion and financial-review handoff on local fixtures only).

Migration 25 adds three retained tables and immutable triggers. It does not convert, accept or reprice existing estimates. Roll back application code only if necessary; preserve retained records and their schema.
