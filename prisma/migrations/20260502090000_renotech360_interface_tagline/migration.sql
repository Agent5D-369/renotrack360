ALTER TABLE "Organization"
  ALTER COLUMN "weeklyReportFooter" SET DEFAULT 'Prepared in RenoTech360 Command Center. Renovation operations from lead to closeout.';

UPDATE "Organization"
SET "weeklyReportFooter" = 'Prepared in RenoTech360 Command Center. Renovation operations from lead to closeout.'
WHERE "weeklyReportFooter" = 'Prepared by Flipside Renovations. Veteran-owned renovation operations.';
