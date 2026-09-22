import { NextRequest, NextResponse } from "next/server";
import { staffApiDenial } from "@/lib/staff-access";
import {
  AiRuntimeError,
  aiDraftInputSchema,
  callLLM,
  estimateReviewPrompt,
  publicAiRuntimeFailure,
  weeklyReportPrompt,
} from "@/lib/ai";

const MAX_BODY_BYTES = 64_000;

export async function POST(req: NextRequest) {
  const denied = await staffApiDenial();
  if (denied) return denied;

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "AI draft input is invalid." }, { status: 400 });
  }

  const rawBody = await req.text().catch(() => "");
  if (!rawBody || rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "AI draft input is invalid." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "AI draft input is invalid." }, { status: 400 });
  }
  const parsed = aiDraftInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "AI draft input is invalid." }, { status: 400 });
  }

  try {
    if (parsed.data.type === "weekly-report") {
      const prompt = weeklyReportPrompt(parsed.data);
      const result = await callLLM(prompt, "weekly-report", 512, { containsClientData: true });
      return NextResponse.json({ text: result.text, model: result.model });
    }

    const prompt = estimateReviewPrompt(parsed.data);
    const result = await callLLM(prompt, "estimate-review", 1024, { containsClientData: true });
    return NextResponse.json({ text: result.text, model: result.model });
  } catch (error) {
    console.error("AI draft failed", error instanceof AiRuntimeError ? error.code : "unexpected");
    const failure = publicAiRuntimeFailure(error, "The AI draft could not be generated.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
