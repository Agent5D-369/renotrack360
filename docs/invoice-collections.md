# Invoice collections workspace

The invoice register now shows recorded outstanding balances, overdue balances, seven-day dues, receipt-review counts and balance aging. A prioritized queue puts receipt discrepancies before collection, then past-due invoices, missing dates, upcoming dues and drafts. Search covers invoice number, client and job; filters are server-applied and shareable. Legacy `status` links now apply the requested status correctly.

Aging uses the current Austin calendar day and treats stored invoice due dates as date-only values. Due today is current; the seven-day window includes today and the next seven calendar days. Draft, paid and void records do not enter collectible balances. Negative balances and contradictory paid statuses require review. Completed receipts count; pending, failed and refunded receipts do not. Displayed amounts remain recorded amounts, not a cash forecast or independent receipt certification.

Invoice details expose recorded paid, completed receipts and the resulting balance. The payment link opens the existing payment form with only an owned invoice preselected. Amount/date/status still require actual receipt entry, and the existing ledger controls remain authoritative. PDF, edit, job and reconciliation paths remain available. No reminder, email, provider payment or payment link is created by visiting these pages.

Scope: presentation and read-only derivation with an owned form preselection. No schema or database mutation, new payment provider integration, automated collections, historical reconciliation or legal collection advice. Existing externally generated payment links and email delivery have not been end-to-end certified by this unit.

Verification: `node node_modules/tsx/dist/cli.mjs --test scripts/invoice-collections.test.ts`; `node scripts/test-access.mjs access`; `scripts/invoice-collections-http-smoke.ts` on the local restored fixture; TypeScript and production build. The HTTP check verifies filters/search/empty state/detail/preselection/anonymous denial without business writes.
