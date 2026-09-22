# Reviewed weekly reports

WeeklyReport remains the staff draft. Creating or editing it never publishes content. The detail page displays the draft and an explicit **Approve and publish current draft** action. A content digest binds that action to the exact text reviewed; stale forms fail with a review-again message.

Publication locks the source report row, checks current Flipside membership and project ownership, and creates one immutable WeeklyReportPublication plus AuditEvent in a transaction. Concurrent/repeated publication of unchanged content returns the existing revision. Changing and republishing content creates a new revision. Database triggers reject publication update, delete and truncate. Internal notes and unreviewed photos are excluded.

The client portal reads only published revisions. Later draft edits do not change the published copy. Client PDF links are scoped to that job's existing portal token and a publication ID; another job's token or a draft ID returns 404. This does not add expiry/rotation to existing portal tokens. It also does not retroactively approve legacy reports, even those with sentAt populated by old PDF-download behavior.

The staff PDF is labeled Staff Draft and its GET performs no writes. Email sends only the last published revision; no publication means no send. A configured email provider's success still records sentAt using the existing delivery path. Mail-client fallback does not claim delivery. This work does not introduce exactly-once email delivery or send real test messages.

Existing report text, old sentAt metadata and URLs remain stored. Staff can review and publish retained reports deliberately. Rolling back to pre-publication application code would re-expose drafts in the portal; prefer a forward fix or disable the portal during recovery. Never erase publications/audit records to roll back an application.

Verification: `npm run test:reports`, `npm run test:access`, `npm run test:migrations` with a retained backup, typecheck and build. `npm run test:reports-http` requires a migrated disposable loopback database, local built server, matching NEXTAUTH_SECRET and PRESERVATION_TARGET_URL. It proves draft/internal-note exclusion, stable published reads, token-scoped PDFs and write-free PDF GETs. Fixtures remain only in the disposable database because publications are immutable.

## Evidence-assisted drafting

The new-report form can retrieve a fixed seven-calendar-day Austin reporting window ending on the selected date. Field-report dates follow the existing HTML date-input convention and remain UTC-midnight calendar values, so they are not shifted to the prior day during Austin time-zone conversion. The staff-only endpoint uses the verified staff organization and returns only `workCompleted` from field reports explicitly marked client-visible. It never returns crew summaries, blockers, materials, equipment, weather, photos, or other private notes. Results and omissions name their source and date, are size/count bounded, and use private no-store responses.

Evidence is staged for review. A user must explicitly append it, use it in an empty field, or confirm replacement of existing work. Retrieval does not save, publish, send, or invoke AI. AI summary drafting also asks before replacing existing summary text. Completed tasks are deliberately listed as missing coverage because the current Task record has no completion timestamp and no client-visibility review; `updatedAt` is not treated as evidence of when work finished.
