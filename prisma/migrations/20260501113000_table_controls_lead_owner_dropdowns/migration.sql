ALTER TABLE "Lead"
  ADD COLUMN "ownerUserId" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "DropdownOption" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "optionSet" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "system" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DropdownOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Lead_ownerUserId_idx" ON "Lead"("ownerUserId");
CREATE INDEX "Lead_archivedAt_idx" ON "Lead"("archivedAt");
CREATE INDEX "Lead_deletedAt_idx" ON "Lead"("deletedAt");
CREATE INDEX "DropdownOption_organizationId_optionSet_idx" ON "DropdownOption"("organizationId", "optionSet");
CREATE UNIQUE INDEX "DropdownOption_organizationId_optionSet_value_key" ON "DropdownOption"("organizationId", "optionSet", "value");

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DropdownOption"
  ADD CONSTRAINT "DropdownOption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
