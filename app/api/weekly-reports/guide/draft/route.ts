import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { draftReportGuide, ReportGuideError } from "@/lib/report-guide";
import { requireStaff, staffApiDenial } from "@/lib/staff-access";

const MAX_BODY_BYTES = 20_000;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const length = Number(req.headers.get("content-length") ?? 0);
  if (!Number.isFinite(length) || length > MAX_BODY_BYTES) return response({ error: "Check the Report guide request." }, 400);
  const body = await req.text().catch(() => "");
  if (!body || body.length > MAX_BODY_BYTES) return response({ error: "Check the Report guide request." }, 400);
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return response({ error: "Check the Report guide request." }, 400);
  }

  try {
    const actor = await requireStaff();
    const result = await draftReportGuide(prisma, actor.id, raw);
    if (result.state === "pending") return response(result, 202);
    if (result.state === "failed") return response(result, result.replayed ? 409 : 502);
    return response(result);
  } catch (error) {
    if (error instanceof ReportGuideError) return response({ error: error.message }, error.status);
    console.error("Report guide draft failed", error instanceof Error ? error.name : "unexpected");
    return response({ error: "The Report guide could not prepare a draft. Continue with the report form." }, 500);
  }
}
