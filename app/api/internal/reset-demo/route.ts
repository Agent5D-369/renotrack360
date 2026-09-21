import { NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { assertDisposableDemoDatabase } from "@/scripts/database-safety";

export async function POST(request: Request) {
  try {
    assertDisposableDemoDatabase();
  } catch {
    return NextResponse.json({ error: "Reset is restricted to isolated local demo databases" }, { status: 403 });
  }
  // Only allowed in DEMO mode
  if (process.env.TENANT_MODE !== "DEMO") {
    return NextResponse.json({ error: "Not a demo instance" }, { status: 403 });
  }

  // Require secret token to prevent unauthorized resets
  const authHeader = request.headers.get("authorization");
  const secret = process.env.DEMO_RESET_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    execSync("npx tsx prisma/seed.ts", {
      stdio: "pipe",
      env: { ...process.env },
      timeout: 120_000
    });
    return NextResponse.json({ ok: true, resetAt: new Date().toISOString() });
  } catch {
    console.error("[demo-reset] seed failed");
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
