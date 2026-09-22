# Company isolation rollout

CRM preparation (WU017) derives company identity from current verified staff membership for contact, property, lead, activity, quote and estimate pages and mutations. Shell branding, settings reads and logo changes use that same company. Related IDs are checked inside compound write transactions; records with conflicting parent companies and ownerless activities are excluded. Deletions cannot alter foreign reverse-linked records.

Validation: `test:company-scope` exercises two-company predicates and relation assertions; `scripts/company-scope-http-smoke.ts` exercises local lists, details, options and actual profile actions. The HTTP script uses only the retained disposable local database and synthetic fixtures. Existing access and retained estimate acceptance checks remain required.

This is a staged conversion, not multi-company activation. The Flipside-only owner/admin gate remains. Delivery, finance, configuration writes, private PDFs, public capabilities, generic AI, business-key uniqueness and company provisioning must finish their own scoped checks before admitting another company. Broader client, technician and subcontractor roles require explicit authorization paths.

Implementation and release evidence is maintained in the Saberra Vault's `RenoTrack360-Company-Isolation-2026-09-22` and `RenoTrack360-Delivery-Isolation-2026-09-22` notes.
