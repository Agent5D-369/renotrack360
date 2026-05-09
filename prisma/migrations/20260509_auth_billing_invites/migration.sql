-- Add trialEndsAt and canceledAt to Subscription
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);

-- PasswordResetToken
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "token"     TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- InviteToken
CREATE TABLE IF NOT EXISTS "InviteToken" (
    "id"              TEXT NOT NULL,
    "email"           TEXT NOT NULL,
    "organizationId"  TEXT NOT NULL,
    "role"            TEXT NOT NULL DEFAULT 'ADMIN',
    "token"           TEXT NOT NULL,
    "expiresAt"       TIMESTAMP(3) NOT NULL,
    "acceptedAt"      TIMESTAMP(3),
    "invitedByUserId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InviteToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "InviteToken_token_key" ON "InviteToken"("token");
