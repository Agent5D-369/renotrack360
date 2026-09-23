# Company scope conversion plan

Source audit, not a certification. Produced by reading the source at commit `327f3c3` and counting references with `rg`; no runtime behaviour was exercised and no two-company fixture was run. Counts are references in code, not proof that each one is exploitable today.

## The headline

The admission gate and the isolation gap are the same constant. `hasStaffAccess` requires the user's organization and the membership's organization to equal `DEFAULT_ORG_ID` (`lib/staff-policy.ts:13`, `lib/constants.ts:1`). The only reason a second company cannot see Flipside data today is that no other organization id is accepted at the door. Relaxing that single line before converting the remaining call sites is the highest-risk change available in this repository.

`getTenantMode()` / `MULTI` in `lib/tenant.ts` is tagged in-source as not an authorization boundary. Flipping `TENANT_MODE=MULTI` would route reads through `getOrgId(session)` while the mutation paths below still hardcode the default organization. It must not be used as the switch.

## Inventory (112 references, measured at 327f3c3)

| bucket | files | references |
| --- | --- | --- |
| workspace pages | 20 | 51 |
| lib helpers | 11 | 37 |
| `app/actions.ts` mutations | 1 | 15 |
| API routes | 3 | 6 |
| seed | 1 | 3 |

## Four categories carry real cross-company risk

1. **Money.** Financial record scoping is a hardcoded predicate (`lib/financial-record-scope.ts:7`), and the ledger lock takes the default organization as its key (`lib/change-order-ledger.ts:123`). With two companies that is either an unnecessary global serialization or the wrong lock.
2. **Billing identity.** Invoice numbers are generated from a global row count, `CONSULT-${count+1}` (`app/actions.ts:2177`), and the uniqueness check is global (`lib/milestone-billing.ts:118`). Two companies collide, and the number itself leaks the other company's volume. Estimate numbering is already company-scoped (`app/actions.ts:877`) and is the pattern to copy.
3. **Client-facing surfaces.** The public review link falls back to the default organization for branding (`app/api/review/[token]/route.ts:22`), and the approval surface hardcodes Flipside's name, logo, brand colour and the sentence "Flipside will confirm scheduling" (`app/api/approve/[token]/route.ts:23`). A second company's client would see Flipside branding on their own contract.
4. **AI.** Provider lookup and the inference path default to the company (`lib/ai.ts:426`), and the report guide gates on the default organization directly (`lib/report-guide.ts:125`). Per-agent provider and model bindings are already company-scoped, so this is the last mile before a second company's data could be sent on Flipside's connection and budget.

## Already isolated, so do not redo it

Stripe checkout, portal and webhook resolve the organization from the session or subscription metadata; the organization logo route is actor-scoped (`app/api/org/logo/route.ts:11`); the waitlist is platform-level rather than tenant data and needs an ownership decision rather than a rewrite.

## Proposed wave order

| wave | scope | acceptance |
| --- | --- | --- |
| 0 | Numbering and public branding, no schema change | Two companies can hold the same invoice number; no hardcoded Flipside brand or copy on any token surface |
| 1 | Finance mutations: `financial-record-scope`, job finance, change-order ledger, the finance block in `actions.ts`, invoice and payment pages | Two-company fixtures deny foreign list, detail, create, update and delete with no rows written; the ledger lock is keyed by the actor company |
| 2 | Work packages and private media resolution (`lib/work-package.ts:20`) plus `readPrivateAsset` actors | Foreign job, scope and phase denied; a company A asset cannot be attached to a company B record |
| 3 | AI, report guide and `api/ai/*` | Provider, budget and credentials resolve from the actor company; a company with no connection fails closed instead of using Flipside's |
| 4 | Settings, branding, terminology, catalog and import pages | As WU021 did for the two settings writers, extended to the remaining page-level reads |
| 5 | Token surfaces: `api/pdf/*`, portal, review | The owning company resolves from the record, never the default; a company A token cannot render company B content |
| 6 | Access switch and provisioning | `hasStaffAccess` derives from current membership; invite acceptance stops pinning to the default organization; only then is `MULTI` discussed |

Waves 0 to 2 are the ones with a live money or identity failure mode, and wave 0 is small enough to land alongside in-flight work.

## Open decisions

- There is no organization-creation path anywhere in the application; auth only reads an existing `organizationId`. Provisioning is a design decision, not a conversion.
- The "a missing setting becomes a meaningful value" shape that bit WU021 twice applies directly to per-company numbering and to approval thresholds, so each wave needs the null-versus-zero check built into its tests rather than added afterwards.
