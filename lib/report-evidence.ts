import type { PrismaClient } from "@prisma/client";

const AUSTIN_TIME_ZONE = "America/Chicago";
const DAY_MS = 86_400_000;
const MAX_SOURCES = 25;
const MAX_SOURCE_CHARS = 1_500;
const MAX_DRAFT_CHARS = 8_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class ReportEvidenceError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export interface WeeklyReportEvidence {
  jobId: string;
  jobName: string;
  range: {
    timeZone: typeof AUSTIN_TIME_ZONE;
    startDate: string;
    endDate: string;
    startInclusive: string;
    endExclusive: string;
  };
  draft: { workCompleted: string };
  sources: Array<{
    type: "FIELD_REPORT";
    id: string;
    date: string;
    label: string;
    clientSafeText: string;
  }>;
  missingCoverage: string[];
}

function dateParts(day: string) {
  if (!DATE_ONLY.test(day)) throw new ReportEvidenceError("Week ending must be a calendar date in YYYY-MM-DD format.");
  const [year, month, date] = day.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== date) {
    throw new ReportEvidenceError("Week ending must be a valid calendar date.");
  }
  return { year, month, date, parsed };
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function weeklyEvidenceWindow(weekEnding: string) {
  const { parsed: endDay } = dateParts(weekEnding);
  const startDay = new Date(endDay.getTime() - 6 * DAY_MS);
  const afterEndDay = new Date(endDay.getTime() + DAY_MS);
  const startDate = formatDateOnly(startDay);
  const endExclusiveDate = formatDateOnly(afterEndDay);
  return {
    timeZone: AUSTIN_TIME_ZONE,
    startDate,
    endDate: weekEnding,
    // FieldReport.reportDate comes from an HTML date input and is stored as UTC midnight.
    // Treat it as a calendar date rather than shifting it through a time-zone conversion.
    startInclusive: new Date(`${startDate}T00:00:00.000Z`),
    endExclusive: new Date(`${endExclusiveDate}T00:00:00.000Z`),
  } as const;
}

function cleanEvidenceText(value: string) {
  const cleaned = value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (cleaned.length <= MAX_SOURCE_CHARS) return cleaned;
  return `${cleaned.slice(0, MAX_SOURCE_CHARS - 1).trimEnd()}…`;
}

function boundedDraft(lines: string[]) {
  const text = lines.join("\n\n");
  if (text.length <= MAX_DRAFT_CHARS) return text;
  return `${text.slice(0, MAX_DRAFT_CHARS - 1).trimEnd()}…`;
}

export async function assembleWeeklyReportEvidence(
  db: PrismaClient,
  organizationId: string,
  jobId: string,
  weekEnding: string,
): Promise<WeeklyReportEvidence> {
  if (!organizationId.trim()) throw new ReportEvidenceError("A verified organization is required.", 403);
  if (!jobId || jobId.length > 128) throw new ReportEvidenceError("Select a valid job.");
  const window = weeklyEvidenceWindow(weekEnding);
  const job = await db.job.findFirst({
    where: { id: jobId, organizationId },
    select: { id: true, jobName: true },
  });
  if (!job) throw new ReportEvidenceError("Job not found.", 404);

  const dateWhere = { gte: window.startInclusive, lt: window.endExclusive };
  const [visibleCount, fieldReports, privateCount, completedTaskCount] = await Promise.all([
    db.fieldReport.count({ where: { jobId: job.id, clientVisible: true, reportDate: dateWhere } }),
    db.fieldReport.findMany({
      where: { jobId: job.id, clientVisible: true, reportDate: dateWhere },
      orderBy: [{ reportDate: "asc" }, { id: "asc" }],
      take: MAX_SOURCES,
      select: { id: true, reportDate: true, workCompleted: true },
    }),
    db.fieldReport.count({ where: { jobId: job.id, clientVisible: false, reportDate: dateWhere } }),
    db.task.count({ where: { jobId: job.id, status: "COMPLETE" } }),
  ]);

  const sources = fieldReports
    .map((report) => ({ report, text: cleanEvidenceText(report.workCompleted) }))
    .filter(({ text }) => text.length > 0)
    .map(({ report, text }) => ({
      type: "FIELD_REPORT" as const,
      id: report.id,
      date: formatDateOnly(report.reportDate),
      label: "Client-visible field report",
      clientSafeText: text,
    }));

  const missingCoverage: string[] = [];
  if (sources.length === 0) missingCoverage.push("No client-visible field reports with completed-work text were found in this Austin reporting window.");
  if (privateCount > 0) missingCoverage.push(`${privateCount} private field report${privateCount === 1 ? " was" : "s were"} excluded; private crew, blocker, material, equipment, weather, photo, and note content is never copied.`);
  if (completedTaskCount > 0) missingCoverage.push(`${completedTaskCount} task${completedTaskCount === 1 ? " is" : "s are"} marked complete, but tasks are excluded because the current record has neither a completion timestamp nor a client-visibility review.`);
  else missingCoverage.push("Task records are excluded because the current record has neither a completion timestamp nor a client-visibility review.");
  if (visibleCount > MAX_SOURCES) missingCoverage.push(`Only the first ${MAX_SOURCES} of ${visibleCount} client-visible field reports are loaded; review the job log for the remainder.`);

  return {
    jobId: job.id,
    jobName: job.jobName,
    range: {
      timeZone: window.timeZone,
      startDate: window.startDate,
      endDate: window.endDate,
      startInclusive: window.startInclusive.toISOString(),
      endExclusive: window.endExclusive.toISOString(),
    },
    draft: { workCompleted: boundedDraft(sources.map((source) => `${source.date}: ${source.clientSafeText}`)) },
    sources,
    missingCoverage,
  };
}
