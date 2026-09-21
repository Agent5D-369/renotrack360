# Private media and audit foundation

New staff uploads use an attached persistent volume, never public static files or a container's temporary filesystem. Existing external URLs are unchanged.

Set `PRIVATE_MEDIA_ROOT=/data/flipside-media` on the production app with a Railway volume mounted at `/data`. Production refuses a missing, relative or same-device-as-root storage location. The volume must remain attached when deploying or recovering the application. Database backups and media-volume backups are separate recovery assets.

Only current active Flipside management members can upload or retrieve a file. The parent profile/property/quote/job/report/change order/invoice must belong to their organization. Revoking membership revokes file access on the next request. Customer publication and subcontractor capability access are intentionally separate future work.

Files retain their original bytes, randomized private key, SHA256, MIME type, byte count, uploader and organization. JPG/PNG/WebP images are decoded for validity with a 40-megapixel limit. PDFs require a matching header and end marker and are downloaded as attachments; this is format validation, not malware scanning. Each file is limited to 10 MB. The upload endpoint bounds the whole multipart request to 11 MB even without Content-Length; field-report server actions have a 20 MB request bound.

FileAsset and FILE_UPLOADED AuditEvent commit together. A failed database transaction removes its new blob. A process crash between filesystem and database operations can leave an unreferenced blob; there is no automatic deletion job. Downloads verify the stored length and digest before returning private/no-store content. Database triggers reject AuditEvent update, delete and truncate; a database administrator remains capable of changing schema and is outside this application-level boundary.

The additive migration leaves historical FileAsset fields nullable and does not reclassify or publish legacy files. Application rollback may use the preceding release with the same non-destructive startup; keep the additive schema and volume. Do not drop audit records or roll back the database to undo an application release.

Verification:

- `npm run test:media`: disposable PostgreSQL integration tests for ownership, content checks, private keys, integrity, atomic asset/audit creation, append-only history and production storage refusal.
- `npm run test:access`: current membership/auth/invitation and entrypoint coverage.
- `npm run test:migrations` with `PRESERVATION_DIRECTORY`: empty/historical/restored migration replay and original-value preservation.
- `npm run test:media-http` with a loopback `PRESERVATION_TARGET_URL`, localhost `ACCESS_SMOKE_ORIGIN` and `PRIVATE_MEDIA_ROOT` beneath `.preservation`: actual credentials login, upload/download, audit and denial tests. Use a disposable migrated database. Audit fixtures are retained there, not deleted.

Local Windows HTTP tests run the built server with NODE_ENV=test because a normal workspace directory cannot satisfy the production persistent-volume gate. Production separately requires mount verification and a synthetic filesystem persistence probe across restart; never manufacture client evidence for this test.
