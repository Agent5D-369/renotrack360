import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assembleWeeklyReportEvidence, ReportEvidenceError } from "@/lib/report-evidence";
import { requireStaff, staffApiDenial } from "@/lib/staff-access";

const response = (body: unknown, status = 200) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function POST(request: Request) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  try {
    const staff = await requireStaff();
    const body = await request.json() as { jobId?: unknown; weekEnding?: unknown };
    const evidence = await assembleWeeklyReportEvidence(
      prisma,
      staff.organizationId,
      typeof body.jobId === "string" ? body.jobId : "",
      typeof body.weekEnding === "string" ? body.weekEnding : "",
    );
    return response(evidence);
  } catch (error) {
    if (error instanceof ReportEvidenceError) return response({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return response({ error: "Provide a valid evidence request." }, 400);
    console.error("[weekly-report-evidence] failed");
    return response({ error: "Unable to load report evidence." }, 500);
  }
}
