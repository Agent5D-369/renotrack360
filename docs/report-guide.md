# Report guide

The Report guide prepares one editable weekly client-summary draft from a staff-selected job and Austin reporting week. It is an AI-assisted guide for staff review. It never saves a weekly report, publishes a revision, sends a message, or changes a job status.

## Source and authority boundary

The server selects client-visible field reports for the requested job and seven-day reporting window. Private field reports, internal notes, margins, other jobs, undated tasks, and out-of-window records are excluded. Staff may add four bounded inputs: completed work, issues, decisions needed, and next-week plans. Those inputs retain staff provenance and do not become independent verification.

The retained workflow trace contains a Human Sovereignty Membrane and 12 cooperating functions: Vitality, Homeostasis, Perception, Attention, Memory, Semantic World Model, Threat/Integrity, Executive Judgment, Action Authority, Calibration, Social Identity, and Metacognition. Each function returns structured state, outputs, failure signals, and downstream feeds used by the drafting pipeline. The configuration is versioned as `weekly-report-guide` version 1.

The semantic model keeps planned, completed, inspected, approved, billed, and paid states distinct. The provider prompt treats all evidence, staff text, and remembered wording as untrusted data. It asks for two to four warm, practical sentences, omits unsupported facts, and does not turn plans into promises.

## Durable request lifecycle

`POST /api/weekly-reports/guide/draft` accepts a UUID `requestId`, `jobId`, `weekEnding` in `YYYY-MM-DD`, and the four optional staff inputs. The body is capped at 20 KB and each staff field at 4,000 characters.

The service claims a unique company/request pair before the provider call. A matching `IN_PROGRESS` retry returns `pending`; a matching completed draft returns the retained result; a conflicting replay is rejected. A failed task requires a new request ID. A database advisory lock and unique index ensure concurrent matching requests can make at most one provider call. A process interruption after the durable claim leaves the task pending for operator review rather than issuing an automatic second call.

Before any provider request, the service checks the active provider, resolved credential reference, client-data approval, supported retention mode, and recorded monthly budget. No provider call is made when there is no client-visible evidence and every staff input is empty. Provider or usage-recording failures retain a generic manual-fallback result without provider error bodies or credentials.

The monthly budget check uses already recorded usage. It is a conservative pre-call gate, not an atomic reservation across unrelated simultaneous tasks. Nonzero token usage is rounded up to at least one cent.

## Human review and style memory

The application saves the weekly report and calls `reviewGuideTask` in the same database transaction. The helper verifies active staff membership, company, job, reporting week, retained source context, task state, and exact final client summary. It then retains the original draft, final summary, reviewer, review time, optional correction, and an audit event. A completed review is idempotent only for the exact same report, final text, and correction.

Ordinary edits do not train or alter the guide. A reviewer must explicitly remember a correction in one of four categories: `formatting`, `detail`, `ordering`, or `terminology`. Job corrections apply only to that job. Company corrections require an owner. Approved corrections influence wording only; they are never factual project evidence.

## API outcomes

- `ready` returns the task ID, editable client summary, safe source references, missing coverage, known inputs, configuration version, and whether the reviewer may save company-wide wording.
- `pending` returns HTTP 202 and the retained task ID.
- `failed` returns a generic manual fallback. The first failure uses HTTP 502; replaying its request ID uses HTTP 409 and requires a new ID.

Responses are private and not cached. The endpoint never returns source private text, secrets, provider response bodies, or raw internal errors.
