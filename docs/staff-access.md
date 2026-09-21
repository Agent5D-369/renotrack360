# Flipside staff access boundary

The management workspace requires an existing user in `flipside-org` and a current
ACTIVE membership in the same organization. Both user and membership roles must be
OWNER or ADMIN. A user row, old JWT, Google account or public demo credential alone
does not grant access. Reserved demo accounts never enter this workspace.

Checks run before data reads in every workspace page, before every exported server
action and inside every protected API handler. The layout also checks membership.
React request-scoped caching avoids duplicate lookups within a page render; no
membership result is cached across requests. Disabling membership blocks already
issued sessions on their next protected request.

Google login accepts only verified email identities already authorized by this
policy. It does not provision users, organizations, memberships or subscriptions.
Credentials use a stored password hash. The existing configured owner password
remains supported only for an already-authorized owner, uses a constant-time
comparison, must be at least 12 characters and performs no account writes. It cannot
bootstrap, promote or move an account. Environment configuration is not a substitute
for membership.

## Invitations

Only an active owner/admin may issue a staff invitation. Only an owner can invite
another owner. The current team UI offers administrator access; scoped field/client
workflows are separate capabilities, not unrestricted management membership.

Acceptance rechecks the invitation, organization, expiry, role and inviter's current
authority. It atomically claims the token and creates the new user/membership.
Concurrent acceptance produces one account; replay fails. Existing-account invites
are refused without changing password, name, role, organization or membership.
Manage an existing account through a separately authorized membership operation;
never use an invite token as a password reset or tenant transfer.

The acceptance endpoint is publicly reachable so new invitees can use their token.
Its transaction, not staff middleware, is the authorization boundary. Unsupported
roles, disabled inviters and expired tokens cannot create staff accounts.

## Verification

- `npm run test:access` creates its own disposable PostgreSQL 18 database. It tests
  policy, revocation, login callbacks, read-only owner credentials, tenant bootstrap
  denial, account takeover refusal, invite concurrency/replay and route/action/page
  guard coverage. It sends no emails and makes no AI/payment calls.
- `npm run test:access-http` runs against a local production server and restored
  database supplied through `PRESERVATION_TARGET_URL`, `ACCESS_SMOKE_ORIGIN` and
  `NEXTAUTH_SECRET`. It creates isolated fixture identities, signs in, exercises
  authorized reads and tests stale/foreign/client/field/unapproved sessions through
  real HTTP pages, APIs and a server action. It removes only its own fixtures.
- Typecheck and production build must pass before release. Re-run original-row
  preservation verification after smoke tests and after deployment.

This is an access boundary, not completed per-record tenant isolation or granular
crew permissions. The application still retains legacy single-organization queries.
Customer approval/review/portal tokens, media publication, financial transitions and
the versioned work engine require their own scoped domain controls. Do not enable
new organizations or give client/field users administrative memberships to work
around missing scope-specific workflows.
