# Flipside Renovation Command Center

A production-shaped contractor command center for Flipside Renovations: CRM profiles, leads, properties, quote building, an editable Flipside Cost Catalog, jobs, the 12-point renovation operating system, weekly reports, change orders, estimates, invoices, payments, financing tracking, files, PDFs, and Railway deployment.

## Tech Stack

- Next.js App Router, TypeScript, Tailwind CSS
- PostgreSQL with Prisma ORM and migrations
- NextAuth credentials login for a single-owner MVP
- React Hook Form + Zod validation
- PDFKit for estimate, invoice, weekly report, and change-order PDFs
- Stripe payment link support when `STRIPE_SECRET_KEY` is configured
- Local file storage abstraction for development

## Local Setup

1. Install dependencies:

```bash
npm ci --legacy-peer-deps
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.

4. Run migrations on a new local database. Existing databases must follow
   [the preservation runbook](docs/preservation-release-runbook.md) first.

```bash
npm run db:deploy
```

5. Start development:

```bash
npm run dev
```

Open `http://localhost:3010`. Demo seed/reset is optional and only permitted with
`FLIPSIDE_DATABASE_PURPOSE=disposable-demo`, a loopback database named
`flipside_demo_<name>`, and a non-production environment. It destroys demo data.
Run `npm run db:seed` only on that disposable target, never on preserved records.

## Prisma Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
```

The initial migration lives in `prisma/migrations/20260430000000_init/migration.sql`.

## Railway Deployment

Use the existing RenoTrack360 Railway project and `Agent5D-369/renotrack360`
repository. Do not create a replacement project/database. Production startup is
only `npm start`; schema migration and seed/reset never run automatically.

Before deployment, follow [the preservation runbook](docs/preservation-release-runbook.md).
The existing database was created without a Prisma migration ledger. A verified
baseline is required before `migrate deploy` can be used there. Never run demo seed
on Railway. Keep the existing environment variables and OAuth/domain settings.

The npm lockfile is the build authority; Node is pinned in `.nvmrc`. The older pnpm
lockfile is retained for history and is not the release install path.

## Stripe

Stripe is intentionally not faked. If `STRIPE_SECRET_KEY` is missing, invoice payment-link generation stores a clear configuration message instead of pretending a live link exists. Add a Stripe restricted or secret key to enable live Payment Links.

## Files And Photos

`POST /api/files/upload` stores uploads locally under `LOCAL_UPLOAD_DIR` and records them as `FileAsset` rows. For production, replace `lib/storage.ts` with S3, Cloudinary, UploadThing, or Railway volume storage.

## Seed Data

The seed creates:

- 10 fictional profiles
- 8 leads
- 5 properties
- 3 quotes with line items
- 1 approved job with all 12 renovation phases
- 5 tasks
- 2 weekly reports
- 2 change orders
- 1 invoice and 1 payment
- Financing tracking sample
- 60 original editable Flipside Cost Catalog items, three per category

## Known Limitations

- MVP auth is single-owner credentials login with schema-ready roles.
- File storage is local-development oriented.
- Stripe webhooks are not implemented yet.
- Forms create records; edit/delete flows can be added with the same action patterns.
- Client portals and multi-tenant billing are intentionally left for later.

## Roadmap

- Full edit/delete screens and audit log
- Client approval/signature flows
- Stripe webhook reconciliation
- Crew mobile task/photo workflow
- Cloud file storage
- Role-based permissions
- Multi-tenant contractor accounts
- Email sending for quotes, reports, change orders, and invoices
