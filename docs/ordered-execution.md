# Accepted scope to ordered execution

The job's Work packages page maps a documented, already accepted contract line into a retained ScopeItem and one ordered WorkPackage. The owner reviews the job financial baseline, exact private source PDF, work version, measured scope, responsible installer and matching retained price. Mapping allocates existing contract value without adding a charge. New client acceptance is a separate proposal workflow.

Scope, package definitions, evidence and human reviews are append-only. Evidence belongs to its job and step. Photos require an intact private image; notes cannot substitute for them. Named owner reviews satisfy REVIEW requirements. Every required item and prior hold point must be accepted before proceeding. Only conditional steps allow an explained N/A outcome. Any staff member can block a step; owner acceptance binds its exact evidence and prior reviews. Reopening earlier work invalidates downstream acceptance until reviewed again.

Incomplete packages prevent explicit phase/job completion. Job, portal and closeout phase summaries include package evidence state without publishing internal observations. Existing legacy status remains historical data. Phase reset cannot delete retained execution records.

This first slice is internal management access. It does not certify real site conditions, release purchases, obtain manufacturer/authority approval, create scoped field accounts or replace a contract. Corrections to evidence use a blocking review and appended observations. Scope replacement/voiding and native proposal acceptance remain subsequent work; do not create a false mapping to work around a mismatched contract.

Verification: `node scripts/test-access.mjs work-packages`, financial/access regressions, and `scripts/work-packages-http-smoke.ts` against the isolated restored database. No synthetic job, acceptance, installation evidence or QC is inserted into production.
