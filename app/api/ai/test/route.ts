import { NextResponse } from "next/server";
import { staffApiDenial } from "@/lib/staff-access";
import { AiRuntimeError, callLLM, publicAiRuntimeFailure } from "@/lib/ai";

export async function POST() {
  const denied = await staffApiDenial();
  if (denied) return denied;

  try {
    const result = await callLLM(
      'Reply with exactly: "RenoTrack360 AI connection confirmed." - nothing else.',
      "test",
      32
    );
    return NextResponse.json({
      success: true,
      provider: result.provider,
      model: result.model,
      response: result.text,
    });
  } catch (error) {
    console.error("AI connection test failed", error instanceof AiRuntimeError ? error.code : "unexpected");
    const failure = publicAiRuntimeFailure(error, "The AI connection test failed.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
