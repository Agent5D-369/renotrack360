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
corepack pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.

4. Run migrations and seed data:

```bash
corepack pnpm db:deploy
corepack pnpm db:seed
```

5. Start development:

```bash
corepack pnpm dev
```

Open `http://localhost:3000` and sign in with your configured admin email/password.

## Prisma Commands

```bash
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:deploy
corepack pnpm db:seed
```

The initial migration lives in `prisma/migrations/20260430000000_init/migration.sql`.

## Railway Deployment

1. Create a Railway project from `https://github.com/Agent5D-369/Renovation-Command-Center`.
2. Add Railway PostgreSQL.
3. Set these variables in Railway:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - optional `STRIPE_SECRET_KEY`
   - optional `STRIPE_CURRENCY=usd`
   - optional `APP_BASE_URL`
4. Railway uses `railway.json`:
   - Build: `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm build`
   - Start: `corepack pnpm db:deploy && corepack pnpm start`
5. Run seed once from a Railway shell if desired:

```bash
corepack pnpm db:seed
```

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
