
import { staffApiDenial } from "@/lib/staff-access";
﻿import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callLLM, getActiveProvider } from "@/lib/ai";

export async function POST() {
  const denied = await staffApiDenial();
  if (denied) return denied;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await getActiveProvider();
  if (!provider?.apiKeySecretRef) {
    return NextResponse.json({ error: "No active provider configured." }, { status: 400 });
  }

  try {
    const result = await callLLM(
      'Reply with exactly: "RenoTrack360 AI connection confirmed." - nothing else.',
      "test",
      32
    );
    return NextResponse.json({
      success: true,
      provider: provider.provider,
      model: result.model,
      response: result.text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
