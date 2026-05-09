import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callLLM, weeklyReportPrompt, estimateReviewPrompt } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { type } = body;

    if (type === "weekly-report") {
      const { jobName, workCompleted, issuesFound, decisionsNeeded, nextWeekPlan } = body;
      if (!workCompleted?.trim()) {
        return NextResponse.json({ error: "Work completed is required to generate a summary." }, { status: 400 });
      }
      const prompt = weeklyReportPrompt({ jobName, workCompleted, issuesFound, decisionsNeeded, nextWeekPlan });
      const result = await callLLM(prompt, "weekly-report", 512);
      return NextResponse.json({ text: result.text, model: result.model });
    }

    if (type === "estimate-review") {
      const { projectType, jobName, total, items } = body;
      if (!items?.length) {
        return NextResponse.json({ error: "Add line items first before running an AI review." }, { status: 400 });
      }
      const prompt = estimateReviewPrompt({ projectType, jobName, total, items });
      const result = await callLLM(prompt, "estimate-review", 1024);
      return NextResponse.json({ text: result.text, model: result.model });
    }

    return NextResponse.json({ error: "Unknown draft type." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI draft failed";
    console.error("AI draft error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
