# Security Notes

This app is currently an MVP for a single-owner renovation command center with schema foundations for multi-tenant SaaS.

## Current Protections

- NextAuth middleware protects app routes outside login and auth endpoints.
- `.env` is ignored by Git.
- Production secrets should be stored in Railway environment variables.
- Security headers are configured in `next.config.ts`.
- Stripe payment links only run when `STRIPE_SECRET_KEY` is configured.
- Financing is tracked as a third-party workflow, not fake lending.

## Required Before Public Launch

- Rotate any database credentials pasted into chat or tickets.
- Replace the placeholder admin email/password.
- Add per-organization authorization helpers before true multi-tenant rollout.
- Add rate limiting for auth and upload endpoints.
- Move file storage from local disk to S3, Cloudinary, UploadThing, or Railway volume storage.
- Add audit logs for approvals, payments, change orders, and admin settings.
- Add Stripe webhooks for payment reconciliation.
- Add virus/mime validation for uploaded files.

## UX Safety Rules

- Do not fake integrations.
- Do not send AI-generated client messages without human approval.
- Do not allow changed scope to proceed without clear change-order approval.
- Do not hide pricing, allowances, or overages from client-facing workflows.
