# Reviewed job finances and change approvals

Work unit 007B adds an explicit owner review before new contractual changes. It never infers whether historical payments are complete or adopts production records during deployment.

- The owner retains a private job PDF, reviews current contract/approved changes/receipts, specifies the actual deposit requirement, and acknowledges completeness. A digest binds adoption to the displayed records. The immutable baseline keeps prior amounts, source hash and review reason.
- After adoption, completed receipts and applied approved changes determine job totals. Payment moves reconcile both jobs in the same transaction. A deposit transition requires the documented amount and sufficient receipts; no deposit percentage is invented.
- Positive-price change requests must match an immutable PriceSnapshot. Zero-price changes and credits require the owner to issue them. Draft editing revokes pending links. Approved records require a new adjustment, not rewriting history.
- Each approval link contains a retained client-facing version, expires after 14 days, and requires an explicit review acknowledgment. GET is read-only. The response, applied amount, contract balance and audit commit together under the same financial lock as payments. Replays cannot apply the amount twice.
- Unversioned legacy approval links, including legacy estimate links, require a refreshed workflow and cannot silently approve mutable content. Estimate proposal acceptance remains the next scope-to-execution work unit. Earlier approved history is retained.
- Client change-order PDFs exclude internal notes and use the applied immutable version. Unversioned exports are labeled as recorded draft/history without execution authorization. Closeout does not add changes a second time to the current contract; unreviewed historical figures are labeled.

Verification: `npm run test:financial-review`, `npm run test:payments`, `npm run test:access`, typecheck/build, `scripts/financial-review-http-smoke.ts` against a loopback restored database, and `test:migrations` with a checksummed production backup. No verification sends real email, approves a real client's change, collects/refunds money, or invents source-document acceptance.

Limits: a ledger cannot determine whether an omitted receipt or unsigned agreement exists. The owner must inspect real evidence. Full construction readiness, execution hold points, selection adjustments, partial refunds and the new estimate acceptance workflow remain separate tracked work. No automatic schedule promise is made from added days. Expired links cannot accept a decision; staff retain the approved records and PDF.
