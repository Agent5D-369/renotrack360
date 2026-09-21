BEGIN;
-- CreateTable
CREATE TABLE "WeeklyReportPublication" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "sourceDigest" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weekEnding" TIMESTAMP(3) NOT NULL,
    "workCompleted" TEXT NOT NULL,
    "issuesFound" TEXT,
    "decisionsNeeded" TEXT,
    "budgetNotes" TEXT,
    "scheduleNotes" TEXT,
    "nextWeekPlan" TEXT,
    "clientSummary" TEXT,

    CONSTRAINT "WeeklyReportPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReportPublication_reportId_revision_key" ON "WeeklyReportPublication"("reportId", "revision");

-- AddForeignKey
ALTER TABLE "WeeklyReportPublication" ADD CONSTRAINT "WeeklyReportPublication_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "WeeklyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE FUNCTION flipside_reject_publication_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Published reports are immutable'; END $$;
CREATE TRIGGER report_publication_immutable BEFORE UPDATE OR DELETE ON "WeeklyReportPublication" FOR EACH ROW EXECUTE FUNCTION flipside_reject_publication_mutation();
CREATE TRIGGER report_publication_no_truncate BEFORE TRUNCATE ON "WeeklyReportPublication" FOR EACH STATEMENT EXECUTE FUNCTION flipside_reject_publication_mutation();
COMMIT;
