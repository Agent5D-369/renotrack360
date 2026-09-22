# Versioned work-item pilot

The existing service-template library is preserved. `/service-templates/work-items` adds a reviewed planning pilot; adoption stores its complete typed scope, ordered steps, evidence requirements and source provenance in an immutable `WorkItemVersion` with an atomic audit event. It does not populate legacy markup defaults, rewrite old service templates, generate a contract or attest to completed work.

The version content is a validated JSON aggregate so steps and requirements cannot drift independently of the retained plan. Stable template/step/evidence keys support future execution instances. A unique organization/code/digest and transaction lock make retries safe. The server accepts only the current reviewed digest and its own pilot content, never a client-supplied instruction payload. A future changed plan gets a new revision on adoption; existing content remains retained.

The matched curbed non-steam KERDI pilot uses the verified April 2026 handbook, with original Flipside scope/QC guidance and source pointers. Rick is accountable for QC; actual site conditions, installer competence, trade/inspection responsibility, measurements and release decisions remain per-job requirements. Conditional drain access cannot silently select an incompatible sequence. No production hours or material costs are fabricated.

`npm run test:work-items` exercises provenance/gates, stale/foreign/revoked refusal, rollback, concurrent retry and immutable database triggers. The local HTTP smoke uses a disposable restored database and the real rendered form. Execution packages, evidence submission and enforcement of job completion belong to the next slice.
